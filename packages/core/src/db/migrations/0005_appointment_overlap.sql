-- Half-open intervals allow consecutive appointments. Protect all writers atomically.
CREATE TRIGGER appointments_no_overlap_insert BEFORE INSERT ON appointments
WHEN NEW.status IN ('pending','confirmed')
BEGIN
 SELECT RAISE(ABORT, 'appointment_overlap') WHERE EXISTS (
 SELECT 1 FROM appointments a WHERE a.clinic_id = NEW.clinic_id
 AND a.status IN ('pending','confirmed') AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
 AND ((NEW.doctor_id IS NOT NULL AND a.doctor_id = NEW.doctor_id)
 OR (NEW.operatory_id IS NOT NULL AND a.operatory_id = NEW.operatory_id)));
END;
CREATE TRIGGER appointments_no_overlap_update BEFORE UPDATE ON appointments
WHEN NEW.status IN ('pending','confirmed')
BEGIN
 SELECT RAISE(ABORT, 'appointment_overlap') WHERE EXISTS (
 SELECT 1 FROM appointments a WHERE a.clinic_id = NEW.clinic_id AND a.id <> NEW.id
 AND a.status IN ('pending','confirmed') AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
 AND ((NEW.doctor_id IS NOT NULL AND a.doctor_id = NEW.doctor_id)
 OR (NEW.operatory_id IS NOT NULL AND a.operatory_id = NEW.operatory_id)));
END;
