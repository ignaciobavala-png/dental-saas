CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','invited','disabled')),
  created_at    INTEGER NOT NULL
);

CREATE TABLE plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD'
);

CREATE TABLE clinics (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','suspended','trial')),
  plan_id     TEXT REFERENCES plans(id),
  db_strategy TEXT NOT NULL DEFAULT 'shared'
              CHECK (db_strategy IN ('shared','dedicated')),
  db_ref      TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE memberships (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role       TEXT NOT NULL
             CHECK (role IN ('owner','admin','dentist','receptionist')),
  status     TEXT NOT NULL DEFAULT 'active'
             CHECK (status IN ('active','invited','disabled')),
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, clinic_id)
);
CREATE INDEX idx_memberships_clinic ON memberships(clinic_id);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE domains (
  hostname   TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('subdomain','custom')),
  verified   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_domains_clinic ON domains(clinic_id);

CREATE TABLE subscriptions (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id      TEXT NOT NULL REFERENCES plans(id),
  status       TEXT NOT NULL CHECK (status IN ('active','past_due','cancelled')),
  provider     TEXT,
  external_ref TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id              TEXT PRIMARY KEY,
  actor_user_id   TEXT,
  actor_type      TEXT NOT NULL DEFAULT 'user'
                  CHECK (actor_type IN ('user','ai','system')),
  clinic_id       TEXT,
  action          TEXT NOT NULL,
  entity          TEXT,
  entity_id       TEXT,
  conversation_id TEXT,
  at              INTEGER NOT NULL,
  meta            TEXT
);
CREATE INDEX idx_audit_clinic_at ON audit_log(clinic_id, at);
