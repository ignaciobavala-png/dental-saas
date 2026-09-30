-- 0003_clinical.sql
-- Núcleo clínico y operativo que faltaba para que una secretaría (humana o IA)
-- pueda hacer el trabajo completo: plan de tratamiento, odontograma, evolución,
-- recalls (recordatorios), lista de espera, consultas de la IA e idempotencia.
-- Mismo patrón que 0002: PK compuesta con clinic_id para las FKs compuestas.

-- Plan de tratamiento: qué se le propuso/hizo a un paciente, por pieza.
CREATE TABLE treatment_plan_items (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  patient_id TEXT NOT NULL,
  service_id TEXT,
  tooth      TEXT,
  surface    TEXT,
  fee_cents  INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'planned'
             CHECK (status IN ('planned','accepted','completed','declined')),
  notes      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id),
  FOREIGN KEY (service_id, clinic_id) REFERENCES services(id, clinic_id)
);
CREATE INDEX idx_tpi_clinic_patient ON treatment_plan_items(clinic_id, patient_id, sort_order);

-- Odontograma: hallazgos por pieza/cara.
CREATE TABLE tooth_conditions (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL REFERENCES clinics(id),
  patient_id  TEXT NOT NULL,
  tooth       TEXT NOT NULL,
  surface     TEXT,
  condition   TEXT NOT NULL
              CHECK (condition IN ('caries','restoration','crown','missing','implant','endo')),
  recorded_by TEXT,
  recorded_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id)
);
CREATE INDEX idx_tooth_clinic_patient ON tooth_conditions(clinic_id, patient_id);

-- Evolución: notas clínicas fechadas.
CREATE TABLE clinical_notes (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  patient_id TEXT NOT NULL,
  doctor_id  TEXT,
  note_date  INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id)
);
CREATE INDEX idx_notes_clinic_patient ON clinical_notes(clinic_id, patient_id, note_date);

-- Recalls: recordatorios de control ("volver en 6 meses").
CREATE TABLE recalls (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  patient_id TEXT NOT NULL,
  service_id TEXT,
  due_after  TEXT,
  source     TEXT NOT NULL DEFAULT 'reception'
             CHECK (source IN ('reception','patient','system')),
  status     TEXT NOT NULL DEFAULT 'open'
             CHECK (status IN ('open','scheduled','cancelled')),
  notes      TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id),
  FOREIGN KEY (service_id, clinic_id) REFERENCES services(id, clinic_id)
);
CREATE INDEX idx_recalls_clinic_status ON recalls(clinic_id, status, due_after);

-- Lista de espera: quién quiere un hueco si se libera.
CREATE TABLE waiting_list (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  patient_id   TEXT NOT NULL,
  service_id   TEXT,
  doctor_id    TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','scheduled','cancelled')),
  notes        TEXT,
  created_at   INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id)
);
CREATE INDEX idx_waiting_clinic_status ON waiting_list(clinic_id, status, created_at);

-- Consultas que entran por la secretaría IA y no terminan en turno.
CREATE TABLE ai_inquiries (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  patient_name TEXT NOT NULL,
  topic        TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'landing'
               CHECK (channel IN ('landing','whatsapp')),
  at           INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','contacted','booked')),
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_inquiries_clinic_status ON ai_inquiries(clinic_id, status, at);

-- Idempotencia de acciones de escritura: una clave por operación lógica.
CREATE TABLE idempotency_keys (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL,
  key         TEXT NOT NULL,
  result_json TEXT,
  created_at  INTEGER NOT NULL,
  UNIQUE (clinic_id, key)
);
