import type { Appointment, AppointmentStatus, Doctor, Service } from '@dental/contracts';
import { appointments, clinic, clinicSettings, doctors, faqs, obrasSociales, services } from './fixture';

const TZ_OFFSET_MIN = -180; // America/Argentina/Buenos_Aires (UTC-3, sin DST)
const MS_MIN = 60_000;

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

function toEpoch(dateStr: string, minutesFromMidnight: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0);
  return utcMidnight - TZ_OFFSET_MIN * MS_MIN + minutesFromMidnight * MS_MIN;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isDateStr(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function label(epochMs: number): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: clinicSettings.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

function activeAppointmentsFor(doctorId: string): Appointment[] {
  return appointments.filter(
    (a) =>
      a.doctorId === doctorId &&
      a.clinicId === clinic.id &&
      (a.status === 'pending' || a.status === 'confirmed'),
  );
}

export const clinicService = {
  info() {
    return {
      name: clinic.name,
      address: clinicSettings.contact.address,
      phone: clinicSettings.contact.phone,
      whatsapp: clinicSettings.contact.whatsapp,
      email: clinicSettings.contact.email,
      timezone: clinicSettings.timezone,
      hours: [
        'Lunes a viernes de 9:00 a 19:00',
        'Sábados de 9:00 a 13:00',
        'Domingos cerrado',
      ],
      obrasSociales,
      faqs,
    };
  },
};

export const catalogService = {
  services(): Service[] {
    return services.filter((s) => s.active);
  },
  serviceById(id: string): Service | undefined {
    return services.find((s) => s.id === id && s.active);
  },
  doctors(): Array<Pick<Doctor, 'id' | 'name' | 'specialty' | 'serviceIds'>> {
    return doctors
      .filter((d) => d.active)
      .map((d) => ({ id: d.id, name: d.name, specialty: d.specialty, serviceIds: d.serviceIds }));
  },
  doctorById(id: string): Doctor | undefined {
    return doctors.find((d) => d.id === id && d.active);
  },
};

export const availabilityService = {
  slots(input: { serviceId: string; dateFrom: string; dateTo: string; doctorId?: string }): Slot[] {
    const service = catalogService.serviceById(input.serviceId);
    if (!service) throw new Error(`No existe el servicio ${input.serviceId}.`);
    if (!isDateStr(input.dateFrom) || !isDateStr(input.dateTo)) {
      throw new Error('Las fechas deben venir como YYYY-MM-DD.');
    }

    const candidates = input.doctorId
      ? catalogService.doctors().filter((d) => d.id === input.doctorId)
      : catalogService.doctors();

    const eligible = candidates.filter((d) => d.serviceIds.includes(service.id));
    if (eligible.length === 0) throw new Error('Ningún profesional atiende ese tratamiento.');

    const maxDays = 21;
    const found: Slot[] = [];

    for (let day = 0; day <= maxDays; day += 1) {
      const date = addDays(input.dateFrom, day);
      if (date > input.dateTo) break;

      const hours = clinicSettings.openingHours.find((h) => h.weekday === weekdayOf(date));
      if (!hours) continue;

      for (const doctor of eligible) {
        const taken = activeAppointmentsFor(doctor.id);

        for (
          let startMin = hours.openMin;
          startMin + service.durationMin <= hours.closeMin;
          startMin += clinicSettings.slotMinutes
        ) {
          const startsAt = toEpoch(date, startMin);
          const endsAt = startsAt + service.durationMin * MS_MIN;
          const overlaps = taken.some((a) => startsAt < a.endsAt && endsAt > a.startsAt);
          if (overlaps) continue;

          found.push({
            doctorId: doctor.id,
            doctorName: doctor.name,
            serviceId: service.id,
            startsAt: new Date(startsAt).toISOString(),
            label: `${label(startsAt)} con ${doctor.name}`,
          });
        }
      }
    }

    return found.slice(0, 40);
  },
};

export const bookingService = {
  create(input: {
    serviceId: string;
    doctorId: string;
    startsAt: string;
    patientName: string;
    phone?: string;
    email?: string;
  }): BookingResult {
    const service = catalogService.serviceById(input.serviceId);
    if (!service) throw new Error(`No existe el servicio ${input.serviceId}.`);

    const doctor = catalogService.doctorById(input.doctorId);
    if (!doctor) throw new Error(`No existe el profesional ${input.doctorId}.`);
    if (!doctor.serviceIds.includes(service.id)) {
      throw new Error(`${doctor.name} no atiende ${service.name}.`);
    }

    const startsAt = Date.parse(input.startsAt);
    if (Number.isNaN(startsAt)) throw new Error('El horario no es una fecha válida.');

    const endsAt = startsAt + service.durationMin * MS_MIN;

    const taken = activeAppointmentsFor(doctor.id).some(
      (a) => startsAt < a.endsAt && endsAt > a.startsAt,
    );
    if (taken) throw new Error('Ese horario se acaba de ocupar. Ofrecé otro.');

    const contact = [input.phone, input.email].filter(Boolean).join(' · ');
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      clinicId: clinic.id,
      patientId: null,
      doctorId: doctor.id,
      serviceId: service.id,
      operatoryId: null,
      startsAt,
      endsAt,
      status: 'pending',
      kind: 'patient',
      source: 'ai',
      notes: [`Paciente: ${input.patientName}`, contact ? `Contacto: ${contact}` : null]
        .filter(Boolean)
        .join(' — '),
    };
    appointments.push(appointment);

    return {
      id: appointment.id,
      serviceName: service.name,
      doctorName: doctor.name,
      startsAt: new Date(appointment.startsAt).toISOString(),
      label: label(startsAt),
      status: appointment.status,
    };
  },

  list(): BookingResult[] {
    return appointments
      .slice()
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((a) => {
        const service = services.find((s) => s.id === a.serviceId);
        const doctor = doctors.find((d) => d.id === a.doctorId);
        return {
          id: a.id,
          serviceName: service?.name ?? 'Tratamiento',
          doctorName: doctor?.name ?? 'Profesional',
          startsAt: new Date(a.startsAt).toISOString(),
          label: label(a.startsAt),
          status: a.status,
        };
      });
  },
};
