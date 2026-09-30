import type { TenantDb } from '@dental/core';
import type { AppointmentStatus } from '@dental/contracts';

const MS_MIN = 60_000;
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export type ClinicContent = {
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  openingHours?: Array<{ weekday: number; openMin: number; closeMin: number }>;
  slotMinutes?: number;
  obrasSociales?: string[];
  faqs?: Array<{ q: string; a: string }>;
  testimonials?: Array<{ name: string; text: string }>;
};

type ClinicSettingsRow = {
  clinic_id: string;
  timezone: string;
  locale: string;
  contact_json: string | null;
  theme_json: string | null;
  content_json: string | null;
  updated_at: number;
};

type DoctorRow = {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  active: number;
  created_at: number;
};

type ServiceRow = {
  id: string;
  clinic_id: string;
  code: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  color: string;
  active: number;
  created_at: number;
};

type PatientRow = {
  id: string;
  clinic_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  birthdate: string | null;
  notes: string | null;
  deleted_at: number | null;
  created_at: number;
};

type AppointmentRow = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  doctor_id: string | null;
  service_id: string | null;
  operatory_id: string | null;
  starts_at: number;
  ends_at: number;
  status: AppointmentStatus;
  kind: string;
  source: string;
  notes: string | null;
  created_at: number;
};

export type Slot = {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  startsAt: string;
  label: string;
};

export type BookingResult = {
  id: string;
  patientId?: string;
  serviceName: string;
  doctorName: string;
  startsAt: string;
  label: string;
  status: AppointmentStatus;
};

export type AgendaItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  status: AppointmentStatus;
  kind: string;
  patientId: string | null;
  patientName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  doctorId: string | null;
  doctorName: string | null;
  notes: string | null;
};

function parseContent(row: ClinicSettingsRow | null): ClinicContent {
  if (!row?.content_json) return { name: 'Consultorio' };
  try {
    return JSON.parse(row.content_json) as ClinicContent;
  } catch {
    return { name: 'Consultorio' };
  }
}

function isDateStr(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function toEpoch(dateStr: string, minutesFromMidnight: number, timezoneOffsetMin: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0);
  return utcMidnight - timezoneOffsetMin * MS_MIN + minutesFromMidnight * MS_MIN;
}

function label(epochMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

// Simplificación para el MVP: solo se soporta America/Argentina/Buenos_Aires (UTC-3, sin DST).
const TZ_OFFSET_MIN = -180;

export async function getClinicSettings(db: TenantDb): Promise<{ row: ClinicSettingsRow | null; content: ClinicContent }> {
  const row = await db.get<ClinicSettingsRow>('clinic_settings', db.clinicId);
  return { row, content: parseContent(row) };
}

export const clinicService = {
  async info(db: TenantDb) {
    const { row, content } = await getClinicSettings(db);
    return {
      name: content.name,
      address: content.address ?? null,
      phone: content.phone ?? null,
      whatsapp: content.whatsapp ?? null,
      email: content.email ?? null,
      timezone: row?.timezone ?? 'America/Argentina/Buenos_Aires',
      hours: (content.openingHours ?? []).map(
        (h) =>
          `${WEEKDAY_NAMES[h.weekday]}: ${String(Math.floor(h.openMin / 60)).padStart(2, '0')}:${String(h.openMin % 60).padStart(2, '0')} a ${String(Math.floor(h.closeMin / 60)).padStart(2, '0')}:${String(h.closeMin % 60).padStart(2, '0')}`,
      ),
      obrasSociales: content.obrasSociales ?? [],
      faqs: content.faqs ?? [],
    };
  },

  /**
   * Actualiza el contenido de la landing fusionando con lo que ya hay. Pensado
   * para el copiloto: el modelo manda solo los campos que cambia y no tiene que
   * reenviar el contenido entero (a diferencia de `PUT /api/clinic/settings`,
   * que reemplaza). Ver `docs/05-agentes-ia.md`.
   */
  async updateContent(db: TenantDb, patch: Partial<ClinicContent>): Promise<ClinicContent> {
    const { content } = await getClinicSettings(db);
    const merged: ClinicContent = { ...content, ...patch };
    if (merged.slotMinutes != null && (!Number.isInteger(merged.slotMinutes) || merged.slotMinutes < 5 || merged.slotMinutes > 240)) throw new Error('El intervalo debe estar entre 5 y 240 minutos.');
    if (merged.openingHours?.some((h) => !Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6 || h.openMin < 0 || h.closeMin > 1440 || h.closeMin <= h.openMin)) throw new Error('Revisá los horarios de apertura y cierre.');
    await db.update('clinic_settings', db.clinicId, {
      content_json: JSON.stringify(merged),
      updated_at: Date.now(),
    });
    return merged;
  },
};

export const catalogService = {
  async services(db: TenantDb): Promise<ServiceRow[]> {
    const rows = await db.list<ServiceRow>('services');
    return rows.filter((s) => s.active === 1);
  },
  async serviceById(db: TenantDb, id: string): Promise<ServiceRow | null> {
    const row = await db.get<ServiceRow>('services', id);
    return row && row.active === 1 ? row : null;
  },
  async doctors(db: TenantDb): Promise<Array<DoctorRow & { serviceIds: string[] }>> {
    const doctorRows = (await db.list<DoctorRow>('doctors')).filter((d) => d.active === 1);
    const links = await db.scoped<{ doctor_id: string; service_id: string }>({
      sql: 'SELECT doctor_id, service_id FROM doctor_services WHERE clinic_id = ?',
      args: [db.clinicId],
    });
    const byDoctor = new Map<string, string[]>();
    for (const link of links) {
      const list = byDoctor.get(link.doctor_id) ?? [];
      list.push(link.service_id);
      byDoctor.set(link.doctor_id, list);
    }
    return doctorRows.map((d) => ({ ...d, serviceIds: byDoctor.get(d.id) ?? [] }));
  },
  async doctorById(db: TenantDb, id: string) {
    const all = await catalogService.doctors(db);
    return all.find((d) => d.id === id) ?? null;
  },

  async createService(
    db: TenantDb,
    input: {
      code?: string | null;
      name: string;
      description?: string | null;
      durationMin: number;
      priceCents?: number | null;
      color?: string;
      active?: boolean;
    },
  ) {
    return db.insert<Record<string, unknown>>('services', {
      code: input.code ?? null,
      name: input.name,
      description: input.description ?? null,
      duration_min: input.durationMin,
      price_cents: input.priceCents ?? null,
      color: input.color ?? 'sky',
      active: input.active === false ? 0 : 1,
      created_at: Date.now(),
    } as never);
  },

  async updateService(
    db: TenantDb,
    id: string,
    input: {
      code?: string | null;
      name?: string;
      description?: string | null;
      durationMin?: number;
      priceCents?: number | null;
      color?: string;
      active?: boolean;
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (input.code !== undefined) patch.code = input.code;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.durationMin !== undefined) patch.duration_min = input.durationMin;
    if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
    if (input.color !== undefined) patch.color = input.color;
    if (input.active !== undefined) patch.active = input.active ? 1 : 0;
    return db.update<Record<string, unknown>>('services', id, patch);
  },

  async createDoctor(
    db: TenantDb,
    input: {
      name: string;
      specialty?: string | null;
      bio?: string | null;
      photoUrl?: string | null;
      active?: boolean;
      serviceIds?: string[];
    },
  ) {
    const row = await db.insert<{ id: string }>('doctors', {
      name: input.name,
      specialty: input.specialty ?? null,
      bio: input.bio ?? null,
      photo_url: input.photoUrl ?? null,
      active: input.active === false ? 0 : 1,
      created_at: Date.now(),
    } as never);
    const serviceIds = input.serviceIds ?? [];
    for (const serviceId of serviceIds) {
      await db.scoped({
        sql: 'INSERT INTO doctor_services (clinic_id, doctor_id, service_id) VALUES (?, ?, ?)',
        args: [db.clinicId, row.id, serviceId],
      });
    }
    return { ...row, serviceIds };
  },

  async updateDoctor(
    db: TenantDb,
    id: string,
    input: {
      name?: string;
      specialty?: string | null;
      bio?: string | null;
      photoUrl?: string | null;
      active?: boolean;
      serviceIds?: string[];
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.specialty !== undefined) patch.specialty = input.specialty;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl;
    if (input.active !== undefined) patch.active = input.active ? 1 : 0;

    const row =
      Object.keys(patch).length > 0
        ? await db.update<Record<string, unknown>>('doctors', id, patch)
        : await db.get<Record<string, unknown>>('doctors', id);

    if (input.serviceIds) {
      await db.scoped({
        sql: 'DELETE FROM doctor_services WHERE clinic_id = ? AND doctor_id = ?',
        args: [db.clinicId, id],
      });
      for (const serviceId of input.serviceIds) {
        await db.scoped({
          sql: 'INSERT INTO doctor_services (clinic_id, doctor_id, service_id) VALUES (?, ?, ?)',
          args: [db.clinicId, id, serviceId],
        });
      }
    }
    return row;
  },
};

export const patientsService = {
  async search(db: TenantDb, query: string, limit = 20): Promise<PatientRow[]> {
    const term = `%${query.trim()}%`;
    return db.scoped<PatientRow>({
      sql: `SELECT * FROM patients
            WHERE clinic_id = ? AND deleted_at IS NULL
              AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR document LIKE ?)
            ORDER BY full_name
            LIMIT ?`,
      args: [db.clinicId, term, term, term, term, limit],
    });
  },

  async create(
    db: TenantDb,
    input: {
      fullName: string;
      phone?: string | null;
      email?: string | null;
      document?: string | null;
      birthdate?: string | null;
      notes?: string | null;
    },
  ): Promise<PatientRow> {
    return db.insert<PatientRow>('patients', {
      full_name: input.fullName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      document: input.document ?? null,
      birthdate: input.birthdate ?? null,
      notes: input.notes ?? null,
      created_at: Date.now(),
    } as never);
  },

  async update(
    db: TenantDb,
    id: string,
    input: {
      fullName?: string;
      phone?: string | null;
      email?: string | null;
      document?: string | null;
      birthdate?: string | null;
      notes?: string | null;
    },
  ): Promise<PatientRow> {
    const patch: Record<string, unknown> = {};
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.document !== undefined) patch.document = input.document;
    if (input.birthdate !== undefined) patch.birthdate = input.birthdate;
    if (input.notes !== undefined) patch.notes = input.notes;
    return db.update<PatientRow>('patients', id, patch);
  },
};

export const availabilityService = {
  async slots(
    db: TenantDb,
    input: { serviceId: string; dateFrom: string; dateTo: string; doctorId?: string },
  ): Promise<Slot[]> {
    const service = await catalogService.serviceById(db, input.serviceId);
    if (!service) throw new Error(`No existe el servicio ${input.serviceId}.`);
    if (!isDateStr(input.dateFrom) || !isDateStr(input.dateTo)) {
      throw new Error('Las fechas deben venir como YYYY-MM-DD.');
    }

    const { row, content } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';
    const slotMinutes = Math.max(5, content.slotMinutes ?? 30);
    const openingHours = content.openingHours ?? [];

    const doctors = await catalogService.doctors(db);
    const candidates = input.doctorId ? doctors.filter((d) => d.id === input.doctorId) : doctors;
    const eligible = candidates.filter((d) => d.serviceIds.includes(service.id));
    if (eligible.length === 0) throw new Error('Ningún profesional atiende ese tratamiento.');

    const maxDays = 21;
    const found: Slot[] = [];

    for (let day = 0; day <= maxDays; day += 1) {
      const date = addDays(input.dateFrom, day);
      if (date > input.dateTo) break;

      const hours = openingHours.find((h) => h.weekday === weekdayOf(date));
      if (!hours) continue;

      for (const doctor of eligible) {
        const taken = await db.list<AppointmentRow>('appointments', {
          sql: "doctor_id = ? AND status IN ('pending','confirmed')",
          args: [doctor.id],
        });

        for (
          let startMin = hours.openMin;
          startMin + service.duration_min <= hours.closeMin;
          startMin += slotMinutes
        ) {
          const startsAt = toEpoch(date, startMin, TZ_OFFSET_MIN);
          const endsAt = startsAt + service.duration_min * MS_MIN;
          const overlaps = taken.some((a) => startsAt < a.ends_at && endsAt > a.starts_at);
          if (overlaps || startsAt <= Date.now()) continue;

          found.push({
            doctorId: doctor.id,
            doctorName: doctor.name,
            serviceId: service.id,
            startsAt: new Date(startsAt).toISOString(),
            label: `${label(startsAt, timezone)} con ${doctor.name}`,
          });
        }
      }
    }

    return found.slice(0, 40);
  },
};

async function assertOpeningHours(db: TenantDb, startsAt: number, duration: number) {
  const { content } = await getClinicSettings(db);
  const local = new Date(startsAt + TZ_OFFSET_MIN * MS_MIN);
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const hours = content.openingHours?.find((h) => h.weekday === local.getUTCDay());
  if (!hours || minute < hours.openMin || minute + duration > hours.closeMin ||
      (minute - hours.openMin) % (content.slotMinutes ?? 30) !== 0 || local.getUTCSeconds() !== 0) {
    throw new Error('Ese horario está fuera de la disponibilidad del consultorio. Consultá los horarios disponibles.');
  }
}

export const bookingService = {
  async create(
    db: TenantDb,
    input: {
      serviceId: string;
      doctorId: string;
      startsAt: string;
      patientName?: string;
      phone?: string;
      email?: string;
      patientId?: string;
      status?: AppointmentStatus;
      source?: 'dashboard' | 'ai' | 'landing';
      notes?: string | null;
    },
  ): Promise<BookingResult> {
    const service = await catalogService.serviceById(db, input.serviceId);
    if (!service) throw new Error(`No existe el servicio ${input.serviceId}.`);

    const doctor = await catalogService.doctorById(db, input.doctorId);
    if (!doctor) throw new Error(`No existe el profesional ${input.doctorId}.`);
    if (!doctor.serviceIds.includes(service.id)) {
      throw new Error(`${doctor.name} no atiende ${service.name}.`);
    }

    const startsAt = Date.parse(input.startsAt);
    if (!Number.isFinite(startsAt) || startsAt <= Date.now()) throw new Error('Elegí un horario futuro válido.');
    await assertOpeningHours(db, startsAt, service.duration_min);
    const endsAt = startsAt + service.duration_min * MS_MIN;

    const taken = await db.list<AppointmentRow>('appointments', {
      sql: "doctor_id = ? AND status IN ('pending','confirmed')",
      args: [doctor.id],
    });
    const overlaps = taken.some((a) => startsAt < a.ends_at && endsAt > a.starts_at);
    if (overlaps) throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');

    let patientId = input.patientId;
    let createdPatientId: string | null = null;
    if (patientId) {
      const existing = await db.get<PatientRow>('patients', patientId);
      if (!existing) throw new Error(`No existe el paciente ${patientId}.`);
    } else {
      if (!input.patientName) throw new Error('Falta el nombre del paciente.');
      const patient = await db.insert<{ id: string }>('patients', {
        full_name: input.patientName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        document: null,
        birthdate: null,
        notes: 'Creado por la secretaría IA.',
        created_at: Date.now(),
      } as never);
      patientId = patient.id;
      createdPatientId = patient.id;
    }

    const { row } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';

    let appointment: AppointmentRow;
    try {
      appointment = await db.insert<AppointmentRow>('appointments', {
        patient_id: patientId,
        doctor_id: doctor.id,
        service_id: service.id,
        operatory_id: null,
        starts_at: startsAt,
        ends_at: endsAt,
        status: input.status ?? 'pending',
        kind: 'patient',
        source: input.source ?? 'ai',
        notes: input.notes ?? null,
        created_at: Date.now(),
      });
    } catch {
      // Si creamos el paciente y el turno no entró, no dejamos la ficha huérfana.
      if (createdPatientId) await db.remove('patients', createdPatientId).catch(() => {});
      throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');
    }

    return {
      id: appointment.id,
      patientId,
      serviceName: service.name,
      doctorName: doctor.name,
      startsAt: new Date(appointment.starts_at).toISOString(),
      label: label(appointment.starts_at, timezone),
      status: appointment.status,
    };
  },

  async agenda(
    db: TenantDb,
    input: { dateFrom: string; dateTo: string; doctorId?: string; status?: AppointmentStatus },
  ): Promise<AgendaItem[]> {
    if (!isDateStr(input.dateFrom) || !isDateStr(input.dateTo)) {
      throw new Error('Las fechas deben venir como YYYY-MM-DD.');
    }
    const from = toEpoch(input.dateFrom, 0, TZ_OFFSET_MIN);
    const to = toEpoch(input.dateTo, 24 * 60, TZ_OFFSET_MIN);

    const [rows, services, doctors, patients] = await Promise.all([
      db.list<AppointmentRow>('appointments', {
        sql: 'starts_at >= ? AND starts_at < ?',
        args: [from, to],
      }),
      catalogService.services(db),
      catalogService.doctors(db),
      db.list<PatientRow>('patients'),
    ]);
    const { row } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';

    return rows
      .filter((a) => (input.doctorId ? a.doctor_id === input.doctorId : true))
      .filter((a) => (input.status ? a.status === input.status : true))
      .sort((a, b) => a.starts_at - b.starts_at)
      .map((a) => {
        const service = services.find((s) => s.id === a.service_id);
        const doctor = doctors.find((d) => d.id === a.doctor_id);
        const patient = patients.find((p) => p.id === a.patient_id);
        return {
          id: a.id,
          startsAt: new Date(a.starts_at).toISOString(),
          endsAt: new Date(a.ends_at).toISOString(),
          label: label(a.starts_at, timezone),
          status: a.status,
          kind: a.kind,
          patientId: a.patient_id,
          patientName: patient?.full_name ?? null,
          serviceId: a.service_id,
          serviceName: service?.name ?? null,
          doctorId: a.doctor_id,
          doctorName: doctor?.name ?? null,
          notes: a.notes,
        };
      });
  },

  async reschedule(
    db: TenantDb,
    input: { id: string; startsAt: string; doctorId?: string },
  ): Promise<BookingResult> {
    const appointment = await db.get<AppointmentRow>('appointments', input.id);
    if (!appointment) throw new Error('No existe ese turno.');
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      throw new Error('Solo se pueden reprogramar turnos pendientes o confirmados.');
    }
    if (!appointment.service_id) throw new Error('El turno no tiene un tratamiento asociado.');

    const service = await catalogService.serviceById(db, appointment.service_id);
    if (!service) throw new Error('El tratamiento del turno ya no está disponible.');

    const doctorId = input.doctorId ?? appointment.doctor_id;
    if (!doctorId) throw new Error('El turno no tiene profesional asignado.');
    const doctor = await catalogService.doctorById(db, doctorId);
    if (!doctor) throw new Error(`No existe el profesional ${doctorId}.`);
    if (!doctor.serviceIds.includes(service.id)) {
      throw new Error(`${doctor.name} no atiende ${service.name}.`);
    }

    const startsAt = Date.parse(input.startsAt);
    if (!Number.isFinite(startsAt) || startsAt <= Date.now()) throw new Error('Elegí un horario futuro válido.');
    await assertOpeningHours(db, startsAt, service.duration_min);
    const endsAt = startsAt + service.duration_min * MS_MIN;

    const taken = await db.list<AppointmentRow>('appointments', {
      sql: "doctor_id = ? AND status IN ('pending','confirmed') AND id <> ?",
      args: [doctor.id, appointment.id],
    });
    const overlaps = taken.some((a) => startsAt < a.ends_at && endsAt > a.starts_at);
    if (overlaps) throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');

    const { row } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';

    let updated: AppointmentRow;
    try {
      updated = await db.update<AppointmentRow>('appointments', appointment.id, {
        doctor_id: doctor.id,
        starts_at: startsAt,
        ends_at: endsAt,
      });
    } catch {
      throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');
    }

    return {
      id: updated.id,
      patientId: updated.patient_id ?? undefined,
      serviceName: service.name,
      doctorName: doctor.name,
      startsAt: new Date(updated.starts_at).toISOString(),
      label: label(updated.starts_at, timezone),
      status: updated.status,
    };
  },

  async cancel(
    db: TenantDb,
    input: { id: string; reason?: string },
  ): Promise<{ id: string; status: AppointmentStatus }> {
    const appointment = await db.get<AppointmentRow>('appointments', input.id);
    if (!appointment) throw new Error('No existe ese turno.');
    if (appointment.status === 'cancelled') {
      return { id: appointment.id, status: 'cancelled' };
    }

    const notes = input.reason
      ? [appointment.notes, `Cancelado: ${input.reason}`].filter(Boolean).join('\n')
      : appointment.notes;
    const updated = await db.update<AppointmentRow>('appointments', appointment.id, {
      status: 'cancelled',
      notes,
    });
    return { id: updated.id, status: updated.status };
  },

  async list(db: TenantDb): Promise<BookingResult[]> {
    const [rows, services, doctors] = await Promise.all([
      db.list<AppointmentRow>('appointments', { sql: "kind = 'patient'", args: [] }),
      catalogService.services(db),
      catalogService.doctors(db),
    ]);
    const { row } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';

    return rows
      .slice()
      .sort((a, b) => a.starts_at - b.starts_at)
      .map((a) => {
        const service = services.find((s) => s.id === a.service_id);
        const doctor = doctors.find((d) => d.id === a.doctor_id);
        return {
          id: a.id,
          serviceName: service?.name ?? 'Tratamiento',
          doctorName: doctor?.name ?? 'Profesional',
          startsAt: new Date(a.starts_at).toISOString(),
          label: label(a.starts_at, timezone),
          status: a.status,
        };
      });
  },
};

type TreatmentPlanRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string | null;
  tooth: string | null;
  surface: string | null;
  fee_cents: number;
  status: string;
  notes: string | null;
  sort_order: number;
  created_at: number;
};

type ToothConditionRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  tooth: string;
  surface: string | null;
  condition: string;
  recorded_by: string | null;
  recorded_at: number;
};

type ClinicalNoteRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  note_date: number;
  body: string;
  created_by: string | null;
  created_at: number;
};

type RecallRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string | null;
  due_after: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: number;
};

type WaitingRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string | null;
  doctor_id: string | null;
  duration_min: number;
  status: string;
  notes: string | null;
  created_at: number;
};

type InquiryRow = {
  id: string;
  clinic_id: string;
  patient_name: string;
  topic: string;
  channel: string;
  at: number;
  status: string;
};

export const treatmentPlanService = {
  async listByPatient(db: TenantDb, patientId: string): Promise<TreatmentPlanRow[]> {
    const rows = await db.list<TreatmentPlanRow>('treatment_plan_items', {
      sql: 'patient_id = ?',
      args: [patientId],
    });
    return rows.sort((a, b) => a.sort_order - b.sort_order);
  },

  async create(
    db: TenantDb,
    input: {
      patientId: string;
      serviceId?: string | null;
      tooth?: string | null;
      surface?: string | null;
      feeCents?: number;
      status?: string;
      notes?: string | null;
      sortOrder?: number;
    },
  ): Promise<TreatmentPlanRow> {
    const patient = await db.get<PatientRow>('patients', input.patientId);
    if (!patient) throw new Error(`No existe el paciente ${input.patientId}.`);
    return db.insert<TreatmentPlanRow>('treatment_plan_items', {
      patient_id: input.patientId,
      service_id: input.serviceId ?? null,
      tooth: input.tooth ?? null,
      surface: input.surface ?? null,
      fee_cents: input.feeCents ?? 0,
      status: input.status ?? 'planned',
      notes: input.notes ?? null,
      sort_order: input.sortOrder ?? 0,
      created_at: Date.now(),
    } as never);
  },

  async update(
    db: TenantDb,
    id: string,
    patch: {
      serviceId?: string | null;
      tooth?: string | null;
      surface?: string | null;
      feeCents?: number;
      status?: string;
      notes?: string | null;
      sortOrder?: number;
    },
  ): Promise<TreatmentPlanRow> {
    const data: Record<string, unknown> = {};
    if (patch.serviceId !== undefined) data.service_id = patch.serviceId;
    if (patch.tooth !== undefined) data.tooth = patch.tooth;
    if (patch.surface !== undefined) data.surface = patch.surface;
    if (patch.feeCents !== undefined) data.fee_cents = patch.feeCents;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.sortOrder !== undefined) data.sort_order = patch.sortOrder;
    return db.update<TreatmentPlanRow>('treatment_plan_items', id, data);
  },

  async remove(db: TenantDb, id: string): Promise<void> {
    await db.remove('treatment_plan_items', id);
  },
};

export const toothConditionService = {
  async listByPatient(db: TenantDb, patientId: string): Promise<ToothConditionRow[]> {
    return db.list<ToothConditionRow>('tooth_conditions', { sql: 'patient_id = ?', args: [patientId] });
  },

  /** Un hallazgo por pieza/cara: pisar el anterior en vez de acumular. */
  async record(
    db: TenantDb,
    input: { patientId: string; tooth: string; surface?: string | null; condition: string; recordedBy?: string | null },
  ): Promise<ToothConditionRow> {
    const surface = input.surface ?? null;
    const existing = await db.list<ToothConditionRow>('tooth_conditions', {
      sql: 'patient_id = ? AND tooth = ? AND (surface IS ? OR surface = ?)',
      args: [input.patientId, input.tooth, surface, surface],
    });
    for (const row of existing) await db.remove('tooth_conditions', row.id);

    return db.insert<ToothConditionRow>('tooth_conditions', {
      patient_id: input.patientId,
      tooth: input.tooth,
      surface,
      condition: input.condition,
      recorded_by: input.recordedBy ?? null,
      recorded_at: Date.now(),
    } as never);
  },

  async remove(db: TenantDb, id: string): Promise<void> {
    await db.remove('tooth_conditions', id);
  },
};

export const clinicalNoteService = {
  async listByPatient(db: TenantDb, patientId: string): Promise<ClinicalNoteRow[]> {
    const rows = await db.list<ClinicalNoteRow>('clinical_notes', { sql: 'patient_id = ?', args: [patientId] });
    return rows.sort((a, b) => b.note_date - a.note_date);
  },

  async create(
    db: TenantDb,
    input: { patientId: string; doctorId?: string | null; body: string; noteDate?: number; createdBy?: string | null },
  ): Promise<ClinicalNoteRow> {
    const patient = await db.get<PatientRow>('patients', input.patientId);
    if (!patient) throw new Error(`No existe el paciente ${input.patientId}.`);
    return db.insert<ClinicalNoteRow>('clinical_notes', {
      patient_id: input.patientId,
      doctor_id: input.doctorId ?? null,
      body: input.body,
      note_date: input.noteDate ?? Date.now(),
      created_by: input.createdBy ?? null,
      created_at: Date.now(),
    } as never);
  },

  async remove(db: TenantDb, id: string): Promise<void> {
    await db.remove('clinical_notes', id);
  },
};

export const recallService = {
  async list(db: TenantDb, status?: string): Promise<RecallRow[]> {
    const rows = await db.list<RecallRow>('recalls');
    return rows
      .filter((r) => (status ? r.status === status : true))
      .sort((a, b) => (a.due_after ?? '').localeCompare(b.due_after ?? ''));
  },

  async create(
    db: TenantDb,
    input: { patientId: string; serviceId?: string | null; dueAfter?: string | null; source?: string; notes?: string | null },
  ): Promise<RecallRow> {
    const patient = await db.get<PatientRow>('patients', input.patientId);
    if (!patient) throw new Error(`No existe el paciente ${input.patientId}.`);
    return db.insert<RecallRow>('recalls', {
      patient_id: input.patientId,
      service_id: input.serviceId ?? null,
      due_after: input.dueAfter ?? null,
      source: input.source ?? 'reception',
      status: 'open',
      notes: input.notes ?? null,
      created_at: Date.now(),
    } as never);
  },

  async update(
    db: TenantDb,
    id: string,
    patch: { dueAfter?: string | null; status?: string; notes?: string | null; serviceId?: string | null },
  ): Promise<RecallRow> {
    const data: Record<string, unknown> = {};
    if (patch.dueAfter !== undefined) data.due_after = patch.dueAfter;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.serviceId !== undefined) data.service_id = patch.serviceId;
    return db.update<RecallRow>('recalls', id, data);
  },
};

export const waitingService = {
  async list(db: TenantDb, status?: string): Promise<WaitingRow[]> {
    const rows = await db.list<WaitingRow>('waiting_list');
    return rows
      .filter((w) => (status ? w.status === status : true))
      .sort((a, b) => a.created_at - b.created_at);
  },

  async create(
    db: TenantDb,
    input: {
      patientId: string;
      serviceId?: string | null;
      doctorId?: string | null;
      durationMin?: number;
      notes?: string | null;
    },
  ): Promise<WaitingRow> {
    const patient = await db.get<PatientRow>('patients', input.patientId);
    if (!patient) throw new Error(`No existe el paciente ${input.patientId}.`);
    return db.insert<WaitingRow>('waiting_list', {
      patient_id: input.patientId,
      service_id: input.serviceId ?? null,
      doctor_id: input.doctorId ?? null,
      duration_min: input.durationMin ?? 30,
      status: 'open',
      notes: input.notes ?? null,
      created_at: Date.now(),
    } as never);
  },

  async update(
    db: TenantDb,
    id: string,
    patch: { status?: string; notes?: string | null; serviceId?: string | null; doctorId?: string | null; durationMin?: number },
  ): Promise<WaitingRow> {
    const data: Record<string, unknown> = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.serviceId !== undefined) data.service_id = patch.serviceId;
    if (patch.doctorId !== undefined) data.doctor_id = patch.doctorId;
    if (patch.durationMin !== undefined) data.duration_min = patch.durationMin;
    return db.update<WaitingRow>('waiting_list', id, data);
  },
};

export const inquiryService = {
  async list(db: TenantDb, status?: string): Promise<InquiryRow[]> {
    const rows = await db.list<InquiryRow>('ai_inquiries');
    return rows.filter((i) => (status ? i.status === status : true)).sort((a, b) => b.at - a.at);
  },

  async create(db: TenantDb, input: { patientName: string; topic: string; channel?: string }): Promise<InquiryRow> {
    return db.insert<InquiryRow>('ai_inquiries', {
      patient_name: input.patientName,
      topic: input.topic,
      channel: input.channel ?? 'landing',
      at: Date.now(),
      status: 'new',
    } as never);
  },

  async update(db: TenantDb, id: string, patch: { status?: string }): Promise<InquiryRow> {
    return db.update<InquiryRow>('ai_inquiries', id, patch.status ? { status: patch.status } : {});
  },
};

/** Ficha completa de un paciente para el panel: todo en una sola llamada. */
export async function patientBundle(db: TenantDb, id: string) {
  const [patient, appointments, plan, conditions, notes] = await Promise.all([
    db.get<PatientRow>('patients', id),
    db.list<AppointmentRow>('appointments', { sql: 'patient_id = ?', args: [id] }),
    treatmentPlanService.listByPatient(db, id),
    toothConditionService.listByPatient(db, id),
    clinicalNoteService.listByPatient(db, id),
  ]);
  return {
    patient,
    appointments: appointments.sort((a, b) => b.starts_at - a.starts_at),
    plan,
    conditions,
    notes,
  };
}

/**
 * Idempotencia: ejecuta `run` una sola vez por clave. Si la clave ya existe,
 * devuelve el resultado guardado. Se usa para que un reintento del modelo o un
 * doble submit no dupliquen una operación.
 */
export const idempotencyService = {
  async once<T>(db: TenantDb, key: string, run: () => Promise<T>): Promise<T> {
    let cached: string | null | undefined;
    try {
      const existing = await db.scoped<{ result_json: string | null }>({
        sql: 'SELECT result_json FROM idempotency_keys WHERE clinic_id = ? AND key = ?',
        args: [db.clinicId, key],
      });
      cached = existing[0]?.result_json;
    } catch {
      // La tabla no está disponible (migración sin aplicar, D1 vieja, etc.).
      // La idempotencia es una mejora, no un requisito: nunca bloqueamos la
      // operación de negocio por no poder deduplicar.
      return run();
    }

    if (cached !== undefined) {
      try {
        return cached ? (JSON.parse(cached) as T) : (undefined as T);
      } catch {
        return run();
      }
    }

    const result = await run();
    try {
      await db.insert('idempotency_keys', {
        key,
        result_json: JSON.stringify(result ?? null),
        created_at: Date.now(),
      } as never);
    } catch {
      // Otro request insertó la misma clave primero: devolvemos igual.
    }
    return result;
  },
};

