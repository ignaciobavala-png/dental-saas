# 03 — Modelo de datos

Una sola D1 con dos familias de tablas: **plataforma** (global) y **tenant** (scoped
por `clinic_id`). El aislamiento se apoya en el esquema, no solo en el código.

## 1. Reglas transversales

- Toda entidad de tenant lleva `clinic_id TEXT NOT NULL REFERENCES clinics(id)`.
- PKs de tenant: **UUID/ULID en texto** (`crypto.randomUUID()`), no autoincrement.
  No enumerables y sin colisiones al futuro migrar a DB-per-tenant.
- Toda tabla de tenant tiene `UNIQUE (id, clinic_id)` cuando es target de FK compuesta.
- Índices **liderados por `clinic_id`** (porque el `TenantDb` siempre lo pone primero).
- Fechas en **UTC (epoch ms INTEGER)** + `timezone` de la clínica en `clinic_settings`.
  Evita el bug clásico de `datetime-local`/UTC (mostrar/guardar +3 h).
- Dinero **siempre en centavos (INTEGER)** (`*_cents`), moneda explícita. Nunca `REAL`
  ni punto flotante: el redondeo acumulado desincroniza totales.
- Borrado lógico (`deleted_at INTEGER NULL`) en entidades clínicas; repos filtran por defecto.
- D1 enforza FKs por defecto y soporta FKs compuestas e índices únicos parciales.

## 2. Tablas de plataforma

```sql
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
  -- forward-compat: hoy siempre 'shared'; futuro database-per-tenant
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

-- Resolución de tenant por hostname (landing pública y dominios propios)
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
  provider     TEXT,             -- 'manual' | 'mercadopago' | ...
  external_ref TEXT,
  created_at   INTEGER NOT NULL
);

-- Auditoría de acciones sensibles, incluidas las iniciadas por IA.
CREATE TABLE audit_log (
  id              TEXT PRIMARY KEY,
  actor_user_id   TEXT,                 -- en quién se apoya la acción (puede ser null en system)
  actor_type      TEXT NOT NULL DEFAULT 'user'
                  CHECK (actor_type IN ('user','ai','system')),
  clinic_id       TEXT,
  action          TEXT NOT NULL,        -- ej. 'appointment.create'
  entity          TEXT,
  entity_id       TEXT,
  conversation_id TEXT,                 -- si la acción la originó un agente de IA
  at              INTEGER NOT NULL,
  meta            TEXT                  -- JSON: args, resultado, etc.
);
CREATE INDEX idx_audit_clinic_at ON audit_log(clinic_id, at);
```

## 3. FK compuesta: el patrón anti-cruce

El punto central del aislamiento en el esquema. Un `FOREIGN KEY(patient_id)
REFERENCES patients(id)` **no impide** que una cita de A apunte a un paciente de B.
Se cierra apuntando a la clave compuesta `(id, clinic_id)`.

```sql
CREATE TABLE patients (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  full_name  TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  document   TEXT,
  birthdate  TEXT,
  notes      TEXT,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id)          -- target de las FKs compuestas
);
CREATE INDEX idx_patients_clinic        ON patients(clinic_id);
CREATE INDEX idx_patients_clinic_phone  ON patients(clinic_id, phone);

CREATE TABLE doctors (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  name       TEXT NOT NULL,
  specialty  TEXT,
  bio        TEXT,
  photo_url  TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_doctors_clinic ON doctors(clinic_id);

-- `services` es el catálogo de tratamientos (equivale a `treatment_types` de la
-- referencia OpenDentist, ver §4): código clínico, duración, precio y color.
CREATE TABLE services (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  code         TEXT,                        -- ej. '0110' (nomenclador) o etiqueta corta
  name         TEXT NOT NULL,
  description  TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  price_cents  INTEGER,                     -- ARS en centavos; ver nota de dinero en §1
  color        TEXT NOT NULL DEFAULT 'sky',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL,
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_services_clinic ON services(clinic_id);

CREATE TABLE doctor_services (
  clinic_id  TEXT NOT NULL,
  doctor_id  TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (clinic_id, doctor_id, service_id),
  FOREIGN KEY (doctor_id,  clinic_id) REFERENCES doctors(id,  clinic_id),
  FOREIGN KEY (service_id, clinic_id) REFERENCES services(id, clinic_id)
);

CREATE TABLE availability (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  doctor_id  TEXT NOT NULL,
  weekday    INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=lunes
  start_min  INTEGER NOT NULL,   -- minutos desde medianoche
  end_min    INTEGER NOT NULL,
  valid_from TEXT,
  valid_to   TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id),
  CHECK (start_min < end_min)
);
CREATE INDEX idx_availability_clinic_doctor ON availability(clinic_id, doctor_id, weekday);

CREATE TABLE availability_exceptions (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  doctor_id  TEXT NOT NULL,
  date       TEXT NOT NULL,      -- 'YYYY-MM-DD'
  kind       TEXT NOT NULL CHECK (kind IN ('day_off','extra')),
  start_min  INTEGER,
  end_min    INTEGER,
  FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id)
);
CREATE INDEX idx_avail_exc_clinic_doctor_date ON availability_exceptions(clinic_id, doctor_id, date);

CREATE TABLE appointments (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  patient_id   TEXT,                  -- null en kind != 'patient' (break/lunch/block)
  doctor_id    TEXT,                  -- null en bloqueos de clínica (ej. lunch general)
  service_id   TEXT,                  -- null en break/lunch/block
  operatory_id TEXT,                  -- box/sillón; null si la clínica no modela boxes
  starts_at    INTEGER NOT NULL,      -- epoch ms UTC
  ends_at      INTEGER NOT NULL,
  status       TEXT NOT NULL
               CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  kind         TEXT NOT NULL DEFAULT 'patient'
               CHECK (kind IN ('patient','break','lunch','block')),
  source       TEXT NOT NULL DEFAULT 'dashboard'
               CHECK (source IN ('dashboard','ai','landing')),
  notes        TEXT,
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (patient_id,   clinic_id) REFERENCES patients(id, clinic_id),
  FOREIGN KEY (doctor_id,    clinic_id) REFERENCES doctors(id,  clinic_id),
  FOREIGN KEY (service_id,   clinic_id) REFERENCES services(id, clinic_id),
  FOREIGN KEY (operatory_id, clinic_id) REFERENCES operatories(id, clinic_id),
  CHECK (ends_at > starts_at),
  -- Un turno de paciente exige paciente y profesional; los bloqueos no.
  CHECK (kind <> 'patient' OR (patient_id IS NOT NULL AND doctor_id IS NOT NULL))
);
CREATE INDEX idx_appointments_clinic_start        ON appointments(clinic_id, starts_at);
CREATE INDEX idx_appointments_clinic_doctor_start ON appointments(clinic_id, doctor_id, starts_at);
CREATE INDEX idx_appointments_clinic_operatory    ON appointments(clinic_id, operatory_id, starts_at);
CREATE INDEX idx_appointments_clinic_patient      ON appointments(clinic_id, patient_id);
CREATE INDEX idx_appointments_clinic_status       ON appointments(clinic_id, status);
```

> `kind: 'break' | 'lunch' | 'block'` permite que la agenda muestre bloqueos junto a
> los turnos y que reserven el slot del profesional. Se insertan con
> `status: 'confirmed'` para caer en el índice anti doble-reserva.

### 3.1 Anti doble-reserva (estructural)

No se resuelve con check-then-insert (tiene condición de carrera). Se resuelve con
un índice único parcial: dos requests concurrentes, uno gana y el otro **falla solo**.

```sql
CREATE UNIQUE INDEX ux_appt_slot
  ON appointments (doctor_id, starts_at)
  WHERE status IN ('pending','confirmed');
```

La capa de servicio captura el error de constraint y responde un conflicto manejable
("ese horario se acaba de ocupar").

## 4. Núcleo clínico dental

Modelado a partir del dominio de **OpenDentist** (MIT, ver §9), **adaptado** a nuestras
reglas: multi-tenant, montos en centavos enteros, ids TEXT y fechas epoch ms. El
"tratamiento" clínico es `services` (con `code` y `color`), no una tabla aparte.

### 4.1 Boxes / sillones (`operatories`)

```sql
CREATE TABLE operatories (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'sky',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_operatories_clinic ON operatories(clinic_id, sort_order);
```

### 4.2 Plan de tratamiento / presupuesto (`treatment_plan_items`)

```sql
CREATE TABLE treatment_plan_items (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  patient_id TEXT NOT NULL,
  service_id TEXT,
  tooth      TEXT,               -- FDI: '11'..'48'
  surface    TEXT,               -- 'M'|'O'|'D'|'B'|'L' o combinación
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
CREATE INDEX idx_plan_items_clinic_patient
  ON treatment_plan_items(clinic_id, patient_id, sort_order);
```

### 4.3 Odontograma (`tooth_conditions`)

```sql
CREATE TABLE tooth_conditions (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL REFERENCES clinics(id),
  patient_id  TEXT NOT NULL,
  tooth       TEXT NOT NULL,     -- FDI: '11'..'48'
  surface     TEXT,              -- null = diente completo
  condition   TEXT NOT NULL
              CHECK (condition IN ('caries','restoration','crown','missing','implant','endo')),
  recorded_by TEXT,              -- doctor_id
  recorded_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id)
);
CREATE INDEX idx_tooth_conditions_clinic_patient
  ON tooth_conditions(clinic_id, patient_id, tooth);
```

### 4.4 Evolución clínica (`clinical_notes`)

```sql
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
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id),
  FOREIGN KEY (doctor_id,  clinic_id) REFERENCES doctors(id,  clinic_id)
);
CREATE INDEX idx_clinical_notes_clinic_patient
  ON clinical_notes(clinic_id, patient_id, note_date DESC);
```

### 4.5 Recall / turnos pendientes de agendar (`recalls`)

Equivale a `appointments_to_make` de la referencia: "a este paciente le toca limpieza
en 6 meses". Alimento natural de la secretaría IA y del asistente interno.

```sql
CREATE TABLE recalls (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  patient_id TEXT NOT NULL,
  service_id TEXT,
  due_after  TEXT,               -- 'YYYY-MM-DD'
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
CREATE INDEX idx_recalls_clinic_status_due ON recalls(clinic_id, status, due_after);
```

### 4.6 Lista de espera (`waiting_list`)

```sql
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
  FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id),
  FOREIGN KEY (service_id, clinic_id) REFERENCES services(id, clinic_id),
  FOREIGN KEY (doctor_id,  clinic_id) REFERENCES doctors(id,  clinic_id)
);
CREATE INDEX idx_waiting_clinic_status ON waiting_list(clinic_id, status, created_at);
```

### 4.7 Fase 2 (modeladas, fuera del MVP)

`lab_cases` (trabajos de laboratorio), `invoices` + `invoice_items` (facturación) y
`coberturas` (obras sociales/prepagas: `obra_social`, `plan`, `nro_afiliado`, `titular`,
`vigencia_desde/hasta`, `coseguro_cents`). Mismo patrón (`clinic_id`, `UNIQUE(id, clinic_id)`,
FK compuestas, índice por clínica). Se detallan al iniciar la fase.

## 5. Resto de tablas de tenant

```sql
CREATE TABLE expenses (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  concept    TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'ARS',
  spent_at   INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_expenses_clinic_date ON expenses(clinic_id, spent_at);

-- `kind`: 'public' = visitante en la landing; 'staff' = asistente interno del dashboard.
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL REFERENCES clinics(id),
  kind        TEXT NOT NULL DEFAULT 'public' CHECK (kind IN ('public','staff')),
  channel     TEXT NOT NULL DEFAULT 'web',
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  user_id     TEXT,              -- staff: usuario que habla con el asistente
  visitor_ref TEXT,              -- público: identificador anónimo
  started_at  INTEGER NOT NULL,
  UNIQUE (id, clinic_id)
);
CREATE INDEX idx_conversations_clinic_kind ON conversations(clinic_id, kind, started_at);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL REFERENCES clinics(id),
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content         TEXT,
  tool_name       TEXT,
  tool_args       TEXT,   -- JSON serializado
  created_at      INTEGER NOT NULL,
  UNIQUE (id, clinic_id),
  FOREIGN KEY (conversation_id, clinic_id) REFERENCES conversations(id, clinic_id)
);
CREATE INDEX idx_messages_clinic_conversation ON messages(clinic_id, conversation_id, created_at);

-- 1:1 con la clínica: en un solo lugar el tema y el contenido de la landing
CREATE TABLE clinic_settings (
  clinic_id    TEXT PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  timezone     TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  locale       TEXT NOT NULL DEFAULT 'es-AR',
  contact_json TEXT,   -- teléfono, WhatsApp, dirección, redes
  theme_json   TEXT,   -- colors, typography, borderRadius, logo, hero, layout, sections
  content_json TEXT,   -- name, tagline, description, doctors, treatments, testimonials, ...
  updated_at   INTEGER NOT NULL
);
```

Tablas de contenido de landing a agregar en el MVP o fase 2: `testimonials`,
`faqs`, `gallery`, `insurances` (obras sociales). Mismo patrón (`clinic_id`,
`UNIQUE(id, clinic_id)`, índice por clínica).

## 6. Convenciones de índices

Para cada tabla de tenant:

- `(clinic_id)` siempre.
- Compuestos según la consulta real, **empezando por `clinic_id`**.
  Ej.: `appointments(clinic_id, starts_at)`, `appointments(clinic_id, doctor_id, starts_at)`.
- En las tablas hijas de FK compuesta, índice sobre `(child_id, clinic_id)` para el
  chequeo de FK.

## 7. Migraciones

- Archivos `.sql` planos en `packages/core/src/db/migrations/`, numerados (`0001_init.sql`, ...).
- `wrangler d1 migrations apply` en flujo normal.
- Si el tracker diverge, aplicar suelto con `wrangler d1 execute <db> --remote --file=...`.
- Recordar que SQLite no soporta `ALTER COLUMN`: cambios de constraint → recrear tabla
  y recrear índices.
- Si se recrean tablas con FKs, usar `PRAGMA defer_foreign_keys = on`.

## 8. Inventario (resumen)

| Tabla | Familia | `clinic_id` | FK compuesta | Índice clave |
|---|---|---|---|---|
| `users` | plataforma | — | — | `email UNIQUE` |
| `clinics` | plataforma | — | — | `slug UNIQUE` |
| `plans` | plataforma | — | — | — |
| `memberships` | plataforma | — | — | `UNIQUE(user_id, clinic_id)` |
| `sessions` | plataforma | — | — | `user_id` |
| `domains` | plataforma | — | — | `hostname PK` |
| `subscriptions` | plataforma | — | — | `clinic_id` |
| `audit_log` | plataforma | — | — | `clinic_id`, `at` |
| `clinic_settings` | tenant | PK | — | — |
| `doctors` | tenant | ✓ | target | `clinic_id` |
| `services` | tenant | ✓ | target | `clinic_id` |
| `doctor_services` | tenant | ✓ | ✓ | PK compuesta |
| `availability` | tenant | ✓ | ✓ | `(clinic, doctor, weekday)` |
| `availability_exceptions` | tenant | ✓ | ✓ | `(clinic, doctor, date)` |
| `patients` | tenant | ✓ | target | `(clinic, phone)` |
| `operatories` | tenant | ✓ | target | `(clinic, sort_order)` |
| `appointments` | tenant | ✓ | ✓ | `(clinic, doctor, start)` + unique slot |
| `treatment_plan_items` | tenant | ✓ | ✓ | `(clinic, patient, sort_order)` |
| `tooth_conditions` | tenant | ✓ | ✓ | `(clinic, patient, tooth)` |
| `clinical_notes` | tenant | ✓ | ✓ | `(clinic, patient, note_date)` |
| `recalls` | tenant | ✓ | ✓ | `(clinic, status, due_after)` |
| `waiting_list` | tenant | ✓ | ✓ | `(clinic, status, created_at)` |
| `expenses` | tenant | ✓ | — | `(clinic, spent_at)` |
| `conversations` | tenant | ✓ | target | `(clinic, kind, started_at)` |
| `messages` | tenant | ✓ | ✓ | `(clinic, conversation, created_at)` |
| `lab_cases` / `invoices` / `invoice_items` / `coberturas` *(fase 2)* | tenant | ✓ | ✓ | `clinic_id` |
| `testimonials` / `faqs` / `gallery` | tenant | ✓ | target | `clinic_id` |

## 9. Referencias

- **OpenDentist** (clawnify/OpenDentist, licencia **MIT**) — referencia del **modelo de
  dominio** odontológico (agenda multi-box, odontograma FDI, plan de tratamiento,
  evolución, laboratorio, recall, aging de cuenta corriente). **No se reutiliza su
  código**: es single-tenant, sin auth y con `REAL` para dinero. Nuestro modelo es una
  adaptación (multi-tenant, centavos enteros, ids TEXT, epoch ms).
- **Open Dental** — referencia de dominio adicional (nomenclador, procedimientos).
