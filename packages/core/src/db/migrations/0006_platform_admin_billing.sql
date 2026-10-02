-- Usuario master de la plataforma (gestiona pruebas, pagos y suspensiones).
ALTER TABLE users ADD COLUMN is_platform_admin INTEGER NOT NULL DEFAULT 0;

-- Vencimiento del período pago de un consultorio `active`. NULL = sin vencimiento.
ALTER TABLE clinics ADD COLUMN paid_until INTEGER;
