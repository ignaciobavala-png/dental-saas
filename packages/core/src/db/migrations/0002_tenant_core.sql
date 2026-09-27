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
  UNIQUE (id, clinic_id)
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

CREATE TABLE services (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  code         TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  price_cents  INTEGER,
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

CREATE TABLE availability (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL REFERENCES clinics(id),
  doctor_id  TEXT NOT NULL,
  weekday    INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_min  INTEGER NOT NULL,
  end_min    INTEGER NOT NULL,
  valid_from TEXT,
  valid_to   TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id),
  CHECK (start_min < end_min)
);
CREATE INDEX idx_availability_clinic_doctor ON availability(clinic_id, doctor_id, weekday);

CREATE TABLE appointments (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL REFERENCES clinics(id),
  patient_id   TEXT,
  doctor_id    TEXT,
  service_id   TEXT,
  operatory_id TEXT,
  starts_at    INTEGER NOT NULL,
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
  CHECK (kind <> 'patient' OR (patient_id IS NOT NULL AND doctor_id IS NOT NULL))
);
CREATE INDEX idx_appointments_clinic_start        ON appointments(clinic_id, starts_at);
CREATE INDEX idx_appointments_clinic_doctor_start ON appointments(clinic_id, doctor_id, starts_at);
CREATE INDEX idx_appointments_clinic_operatory    ON appointments(clinic_id, operatory_id, starts_at);
CREATE INDEX idx_appointments_clinic_patient      ON appointments(clinic_id, patient_id);
CREATE INDEX idx_appointments_clinic_status       ON appointments(clinic_id, status);

CREATE UNIQUE INDEX ux_appt_slot
  ON appointments (doctor_id, starts_at)
  WHERE status IN ('pending','confirmed');

CREATE TABLE clinic_settings (
  clinic_id    TEXT PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  timezone     TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  locale       TEXT NOT NULL DEFAULT 'es-AR',
  contact_json TEXT,
  theme_json   TEXT,
  content_json TEXT,
  updated_at   INTEGER NOT NULL
);
