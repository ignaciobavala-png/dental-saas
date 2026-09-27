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
  serviceName: string;
  doctorName: string;
  startsAt: string;
  label: string;
  status: AppointmentStatus;
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
    const slotMinutes = content.slotMinutes ?? 30;
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
          if (overlaps) continue;

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

export const bookingService = {
  async create(
    db: TenantDb,
    input: { serviceId: string; doctorId: string; startsAt: string; patientName: string; phone?: string; email?: string },
  ): Promise<BookingResult> {
    const service = await catalogService.serviceById(db, input.serviceId);
    if (!service) throw new Error(`No existe el servicio ${input.serviceId}.`);

    const doctor = await catalogService.doctorById(db, input.doctorId);
    if (!doctor) throw new Error(`No existe el profesional ${input.doctorId}.`);
    if (!doctor.serviceIds.includes(service.id)) {
      throw new Error(`${doctor.name} no atiende ${service.name}.`);
    }

    const startsAt = Date.parse(input.startsAt);
    if (Number.isNaN(startsAt)) throw new Error('El horario no es una fecha válida.');
    const endsAt = startsAt + service.duration_min * MS_MIN;

    const taken = await db.list<AppointmentRow>('appointments', {
      sql: "doctor_id = ? AND status IN ('pending','confirmed')",
      args: [doctor.id],
    });
    const overlaps = taken.some((a) => startsAt < a.ends_at && endsAt > a.starts_at);
    if (overlaps) throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');

    const { row } = await getClinicSettings(db);
    const timezone = row?.timezone ?? 'America/Argentina/Buenos_Aires';

    const patient = await db.insert<{ id: string }>('patients', {
      full_name: input.patientName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      document: null,
      birthdate: null,
      notes: 'Creado por la secretaría IA.',
      created_at: Date.now(),
    } as never);

    let appointment: AppointmentRow;
    try {
      appointment = await db.insert<AppointmentRow>('appointments', {
        patient_id: patient.id,
        doctor_id: doctor.id,
        service_id: service.id,
        operatory_id: null,
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'pending',
        kind: 'patient',
        source: 'ai',
        notes: null,
        created_at: Date.now(),
      });
    } catch {
      throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');
    }

    return {
      id: appointment.id,
      serviceName: service.name,
      doctorName: doctor.name,
      startsAt: new Date(appointment.starts_at).toISOString(),
      label: label(appointment.starts_at, timezone),
      status: appointment.status,
    };
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
