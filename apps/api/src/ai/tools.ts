import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { TenantDb, TenantContext, Capability } from '@dental/core';
import { can } from '@dental/core';
import {
  availabilityService,
  bookingService,
  catalogService,
  clinicService,
  clinicalNoteService,
  idempotencyService,
  patientsService,
  recallService,
  toothConditionService,
  treatmentPlanService,
  waitingService,
} from '../domain/services';
import type { AuditFn } from '../lib/audit';

/* -------------------------------------------------------------------------- */
/* Inputs                                                                     */
/* -------------------------------------------------------------------------- */

export const getClinicInformationInput = z.strictObject({});
export const getServicesInput = z.strictObject({});
export const getDoctorsInput = z.strictObject({});
export const getAvailableSlotsInput = z.strictObject({
  serviceId: z.string().describe('id del servicio, ej. svc_general'),
  dateFrom: z.string().describe('Fecha inicial en formato YYYY-MM-DD'),
  dateTo: z.string().describe('Fecha final en formato YYYY-MM-DD'),
  doctorId: z.string().optional().describe('Opcional: id del profesional'),
});
export const createAppointmentInput = z.strictObject({
  serviceId: z.string(),
  doctorId: z.string(),
  startsAt: z.string().describe('ISO 8601, exactamente el que devolvió get_available_slots'),
  patient: z.strictObject({
    fullName: z.string().min(1),
    phone: z.string().optional().describe('Teléfono de contacto. Necesario si no hay email.'),
    email: z.string().optional().describe('Email de contacto. Necesario si no hay teléfono.'),
  }),
});

const appointmentStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);

export const getAgendaInput = z.strictObject({
  dateFrom: z.string().describe('Fecha inicial en formato YYYY-MM-DD'),
  dateTo: z.string().describe('Fecha final en formato YYYY-MM-DD'),
  doctorId: z.string().optional().describe('Opcional: filtrar por profesional'),
  status: appointmentStatus.optional().describe('Opcional: filtrar por estado'),
});

export const findPatientInput = z.strictObject({
  query: z.string().describe('Nombre, teléfono, email o documento del paciente'),
});

export const createPatientInput = z.strictObject({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  document: z.string().optional(),
  birthdate: z.string().optional().describe('YYYY-MM-DD'),
  notes: z.string().optional(),
});

export const updatePatientInput = z.strictObject({
  patientId: z.string(),
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  birthdate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const bookAppointmentInput = z.strictObject({
  serviceId: z.string(),
  doctorId: z.string(),
  startsAt: z.string().describe('ISO 8601, exactamente el que devolvió get_available_slots'),
  patientId: z.string().optional().describe('id de un paciente existente (usá find_patient primero)'),
  patient: z
    .strictObject({
      fullName: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional()
    .describe('Datos para dar de alta un paciente nuevo (si no hay patientId)'),
});

export const rescheduleAppointmentInput = z.strictObject({
  appointmentId: z.string(),
  startsAt: z.string().describe('Nuevo horario ISO 8601 confirmado con get_available_slots'),
  doctorId: z.string().optional().describe('Opcional: cambiar también el profesional'),
});

export const cancelAppointmentInput = z.strictObject({
  appointmentId: z.string(),
  reason: z.string().optional().describe('Motivo de la cancelación'),
});

export const createServiceInput = z.strictObject({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.number().int().positive().describe('Duración del turno en minutos'),
  priceCents: z.number().int().nullable().optional().describe('Precio en centavos, si se conoce'),
  code: z.string().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateServiceInput = z.strictObject({
  serviceId: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  durationMin: z.number().int().positive().optional(),
  priceCents: z.number().int().nullable().optional(),
  code: z.string().nullable().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

export const createDoctorInput = z.strictObject({
  name: z.string().min(1),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional().describe('ids de los tratamientos que atiende'),
});

export const updateDoctorInput = z.strictObject({
  doctorId: z.string(),
  name: z.string().min(1).optional(),
  specialty: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export const updateClinicSettingsInput = z.strictObject({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  obrasSociales: z.array(z.string()).optional(),
  slotMinutes: z.number().int().positive().optional(),
  openingHours: z
    .array(
      z.strictObject({
        weekday: z.number().int().min(0).max(6).describe('0=domingo … 6=sábado'),
        openMin: z.number().int().min(0).describe('minutos desde medianoche'),
        closeMin: z.number().int().min(0),
      }),
    )
    .optional(),
  faqs: z.array(z.strictObject({ q: z.string(), a: z.string() })).optional(),
  testimonials: z.array(z.strictObject({ name: z.string(), text: z.string() })).optional(),
});

export const logClinicalNoteInput = z.strictObject({
  patientId: z.string(),
  body: z.string().min(1).describe('Qué pasó en la consulta'),
  doctorId: z.string().optional(),
  noteDate: z.number().int().optional().describe('epoch ms; por defecto, ahora'),
});

export const addTreatmentPlanItemInput = z.strictObject({
  patientId: z.string(),
  serviceId: z.string().optional(),
  tooth: z.string().optional().describe('pieza FDI, ej. 36'),
  surface: z.string().optional(),
  feeCents: z.number().int().optional(),
  notes: z.string().optional(),
});

export const recordToothConditionInput = z.strictObject({
  patientId: z.string(),
  tooth: z.string().min(1).describe('pieza FDI, ej. 36'),
  surface: z.string().optional(),
  condition: z.enum(['caries', 'restoration', 'crown', 'missing', 'implant', 'endo']),
});

export const createRecallInput = z.strictObject({
  patientId: z.string(),
  serviceId: z.string().optional(),
  dueAfter: z.string().optional().describe('YYYY-MM-DD en que conviene volver'),
  notes: z.string().optional(),
});

export const addToWaitingListInput = z.strictObject({
  patientId: z.string(),
  serviceId: z.string().optional(),
  doctorId: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/* Tools                                                                      */
/* -------------------------------------------------------------------------- */

/** Lectura compartida entre la secretaría pública y el copiloto interno. */
function publicReadTools(db: TenantDb): ToolSet {
  return {
    get_clinic_information: tool({
      description: 'Datos de la clínica: dirección, horarios, contacto, obras sociales y preguntas frecuentes.',
      inputSchema: getClinicInformationInput,
      execute: async () => clinicService.info(db),
    }),
    get_services: tool({
      description: 'Lista los tratamientos disponibles con su id, duración y descripción.',
      inputSchema: getServicesInput,
      execute: async () =>
        (await catalogService.services(db)).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMin: s.duration_min,
        })),
    }),
    get_doctors: tool({
      description: 'Lista los profesionales, su especialidad y qué servicios atiende cada uno.',
      inputSchema: getDoctorsInput,
      execute: async () =>
        (await catalogService.doctors(db)).map((d) => ({
          id: d.id,
          name: d.name,
          specialty: d.specialty,
          serviceIds: d.serviceIds,
        })),
    }),
    get_available_slots: tool({
      description: 'Horarios libres para un tratamiento en un rango de fechas.',
      inputSchema: getAvailableSlotsInput,
      execute: async (input) => {
        try {
          const slots = await availabilityService.slots(db, input);
          if (slots.length === 0) return { slots: [], nota: 'No hay horarios libres en ese rango.' };
          return { slots };
        } catch (error) {
          return { slots: [], error: (error as Error).message };
        }
      },
    }),
  };
}

export function buildPublicTools(ctx: TenantContext, db: TenantDb): ToolSet {
  const tools: ToolSet = {
    ...publicReadTools(db),
    create_appointment: tool({
      description:
        'Reserva un turno. Necesita el id del servicio, el del profesional, un horario devuelto por get_available_slots y el nombre del paciente con un contacto.',
      inputSchema: createAppointmentInput,
      execute: async (input) => {
        try {
          if (!input.patient.phone?.trim() && !input.patient.email?.trim()) {
            return { ok: false, error: 'Pedí un teléfono o email de contacto antes de registrar el turno.' };
          }
          const appointment = await bookingService.create(db, {
            serviceId: input.serviceId,
            doctorId: input.doctorId,
            startsAt: input.startsAt,
            source: 'landing',
            patientName: input.patient.fullName,
            phone: input.patient.phone,
            email: input.patient.email,
          });
          return { ok: true, appointment };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
    }),
  };

  const capabilities: Record<string, Capability> = {
    get_clinic_information: 'public:read',
    get_services: 'public:read',
    get_doctors: 'public:read',
    get_available_slots: 'public:read',
    create_appointment: 'public:book',
  };

  return Object.fromEntries(Object.entries(tools).filter(([name]) => can(ctx, capabilities[name]))) as ToolSet;
}

/**
 * Tools del copiloto interno: mismas lecturas que la secretaría pública más
 * las operaciones de mostrador (agenda, pacientes, turnos, catálogo y
 * configuración). No es un set distinto por rol: cada tool declara la
 * capability que exige y el filtro de abajo deja sólo las que el rol del que
 * habla tiene. Un `receptionist`, por ejemplo, no recibe `create_service`.
 */
export function buildStaffTools(ctx: TenantContext, db: TenantDb, audit?: AuditFn): ToolSet {
  const tools: ToolSet = {
    ...publicReadTools(db),

    get_agenda: tool({
      description: 'Turnos de la agenda en un rango de fechas, con paciente, tratamiento y profesional.',
      inputSchema: getAgendaInput,
      execute: async (input) => {
        try {
          return { appointments: await bookingService.agenda(db, input) };
        } catch (error) {
          return { appointments: [], error: (error as Error).message };
        }
      },
    }),

    find_patient: tool({
      description:
        'Busca pacientes por nombre, teléfono, email o documento. Usala SIEMPRE antes de crear uno para no duplicar fichas.',
      inputSchema: findPatientInput,
      execute: async (input) => {
        const patients = await patientsService.search(db, input.query);
        return {
          patients: patients.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            phone: p.phone,
            email: p.email,
            document: p.document,
            birthdate: p.birthdate,
          })),
        };
      },
    }),

    create_patient: tool({
      description: 'Da de alta un paciente nuevo. Antes buscá con find_patient para no duplicarlo.',
      inputSchema: createPatientInput,
      execute: async (input) => {
        const patient = await patientsService.create(db, input);
        await audit?.({ action: 'create_patient', entity: 'patient', entityId: patient.id, meta: { fullName: patient.full_name } });
        return { ok: true, patient: { id: patient.id, fullName: patient.full_name } };
      },
    }),

    update_patient: tool({
      description: 'Actualiza los datos de un paciente existente. Sólo los campos que mandás se modifican.',
      inputSchema: updatePatientInput,
      execute: async (input) => {
        const { patientId, ...patch } = input;
        const patient = await patientsService.update(db, patientId, patch);
        await audit?.({ action: 'update_patient', entity: 'patient', entityId: patient.id, meta: patch });
        return { ok: true, patient: { id: patient.id, fullName: patient.full_name } };
      },
    }),

    book_appointment: tool({
      description:
        'Reserva un turno para un paciente. Necesita servicio, profesional, un horario confirmado con get_available_slots y un paciente: un patientId existente o los datos de uno nuevo. El turno queda confirmado.',
      inputSchema: bookAppointmentInput,
      execute: async (input, { toolCallId }) => {
        if (!input.patientId && !input.patient) {
          return { ok: false, error: 'Pasá un patientId (buscá con find_patient) o los datos del paciente.' };
        }
        try {
          const appointment = await idempotencyService.once(db, `book:${toolCallId}`, () =>
            bookingService.create(db, {
              serviceId: input.serviceId,
              doctorId: input.doctorId,
              startsAt: input.startsAt,
              patientId: input.patientId,
              patientName: input.patient?.fullName,
              phone: input.patient?.phone,
              email: input.patient?.email,
              status: 'confirmed',
            }),
          );
          await audit?.({
            action: 'book_appointment',
            entity: 'appointment',
            entityId: appointment.id,
            meta: { patientId: appointment.patientId, startsAt: appointment.startsAt },
          });
          return { ok: true, appointment };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
    }),

    reschedule_appointment: tool({
      description:
        'Mueve un turno existente a otro horario. Confirmá con el staff antes de ejecutarlo y usá un horario válido de get_available_slots.',
      inputSchema: rescheduleAppointmentInput,
      execute: async (input) => {
        try {
          const appointment = await bookingService.reschedule(db, {
            id: input.appointmentId,
            startsAt: input.startsAt,
            doctorId: input.doctorId,
          });
          await audit?.({
            action: 'reschedule_appointment',
            entity: 'appointment',
            entityId: appointment.id,
            meta: { startsAt: appointment.startsAt, doctorId: appointment.doctorName },
          });
          return { ok: true, appointment };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
    }),

    cancel_appointment: tool({
      description:
        'Cancela un turno. Es una acción consecuente: confirmá con el staff antes de ejecutarla.',
      inputSchema: cancelAppointmentInput,
      execute: async (input) => {
        try {
          const result = await bookingService.cancel(db, { id: input.appointmentId, reason: input.reason });
          await audit?.({
            action: 'cancel_appointment',
            entity: 'appointment',
            entityId: result.id,
            meta: { reason: input.reason ?? null },
          });
          return { ok: true, ...result };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
    }),

    create_service: tool({
      description:
        'Da de alta un tratamiento nuevo en el catálogo. Necesita nombre y duración; el precio es opcional.',
      inputSchema: createServiceInput,
      execute: async (input) => {
        const service = await catalogService.createService(db, input);
        await audit?.({ action: 'create_service', entity: 'service', entityId: String(service.id), meta: { name: input.name } });
        return { ok: true, service };
      },
    }),

    update_service: tool({
      description: 'Modifica un tratamiento del catálogo (nombre, duración, precio, etc.). Sólo los campos que mandás.',
      inputSchema: updateServiceInput,
      execute: async (input) => {
        const { serviceId, ...patch } = input;
        const service = await catalogService.updateService(db, serviceId, patch);
        await audit?.({ action: 'update_service', entity: 'service', entityId: serviceId, meta: patch });
        return { ok: true, service };
      },
    }),

    create_doctor: tool({
      description: 'Da de alta un profesional y, opcionalmente, qué tratamientos atiende (serviceIds).',
      inputSchema: createDoctorInput,
      execute: async (input) => {
        const doctor = await catalogService.createDoctor(db, input);
        await audit?.({ action: 'create_doctor', entity: 'doctor', entityId: doctor.id, meta: { name: input.name } });
        return { ok: true, doctor };
      },
    }),

    update_doctor: tool({
      description: 'Modifica un profesional o los tratamientos que atiende. Sólo los campos que mandás.',
      inputSchema: updateDoctorInput,
      execute: async (input) => {
        const { doctorId, ...patch } = input;
        const doctor = await catalogService.updateDoctor(db, doctorId, patch);
        await audit?.({ action: 'update_doctor', entity: 'doctor', entityId: doctorId, meta: patch });
        return { ok: true, doctor };
      },
    }),

    update_clinic_settings: tool({
      description:
        'Actualiza datos públicos del consultorio (nombre, dirección, contacto, obras sociales, horarios, FAQ). Sólo los campos que mandás: el resto queda igual. Es una acción consecuente, confirmala antes.',
      inputSchema: updateClinicSettingsInput,
      execute: async (input) => {
        const content = await clinicService.updateContent(db, input);
        await audit?.({ action: 'update_clinic_settings', entity: 'clinic_settings', meta: { fields: Object.keys(input) } });
        return { ok: true, content };
      },
    }),

    list_treatment_plan: tool({
      description: 'Plan de tratamiento de un paciente: qué se propuso, en qué pieza y en qué estado está.',
      inputSchema: z.strictObject({ patientId: z.string() }),
      execute: async (input) => ({ items: await treatmentPlanService.listByPatient(db, input.patientId) }),
    }),

    add_treatment_plan_item: tool({
      description: 'Agrega un tratamiento al plan de un paciente (una práctica, con pieza opcional).',
      inputSchema: addTreatmentPlanItemInput,
      execute: async (input) => {
        const item = await treatmentPlanService.create(db, input);
        await audit?.({
          action: 'add_treatment_plan_item',
          entity: 'treatment_plan_item',
          entityId: item.id,
          meta: { patientId: input.patientId, tooth: input.tooth ?? null },
        });
        return { ok: true, item };
      },
    }),

    record_tooth_condition: tool({
      description: 'Registra un hallazgo en una pieza del odontograma (reemplaza el anterior de esa pieza/cara).',
      inputSchema: recordToothConditionInput,
      execute: async (input) => {
        const condition = await toothConditionService.record(db, input);
        await audit?.({
          action: 'record_tooth_condition',
          entity: 'tooth_condition',
          entityId: condition.id,
          meta: { patientId: input.patientId, tooth: input.tooth },
        });
        return { ok: true, condition };
      },
    }),

    log_clinical_note: tool({
      description: 'Registra una nota de evolución en la ficha de un paciente.',
      inputSchema: logClinicalNoteInput,
      execute: async (input) => {
        const note = await clinicalNoteService.create(db, input);
        await audit?.({ action: 'log_clinical_note', entity: 'clinical_note', entityId: note.id, meta: { patientId: input.patientId } });
        return { ok: true, note };
      },
    }),

    list_recalls: tool({
      description: 'Recordatorios de control pendientes (recalls).',
      inputSchema: z.strictObject({}),
      execute: async () => ({ recalls: await recallService.list(db, 'open') }),
    }),

    create_recall: tool({
      description: 'Programa un recordatorio de control para un paciente (ej. limpieza cada 6 meses).',
      inputSchema: createRecallInput,
      execute: async (input) => {
        const recall = await recallService.create(db, input);
        await audit?.({ action: 'create_recall', entity: 'recall', entityId: recall.id, meta: { patientId: input.patientId } });
        return { ok: true, recall };
      },
    }),

    list_waiting_list: tool({
      description: 'Personas en lista de espera para un hueco.',
      inputSchema: z.strictObject({}),
      execute: async () => ({ waiting: await waitingService.list(db, 'open') }),
    }),

    add_to_waiting_list: tool({
      description: 'Suma un paciente a la lista de espera para avisarle si se libera un turno.',
      inputSchema: addToWaitingListInput,
      execute: async (input) => {
        const item = await waitingService.create(db, input);
        await audit?.({ action: 'add_to_waiting_list', entity: 'waiting_list', entityId: item.id, meta: { patientId: input.patientId } });
        return { ok: true, item };
      },
    }),
  };

  const capabilities: Record<string, Capability> = {
    get_clinic_information: 'public:read',
    get_services: 'public:read',
    get_doctors: 'public:read',
    get_available_slots: 'public:read',
    get_agenda: 'appointments:read',
    find_patient: 'patients:read',
    create_patient: 'patients:write',
    update_patient: 'patients:write',
    book_appointment: 'appointments:write',
    reschedule_appointment: 'appointments:write',
    cancel_appointment: 'appointments:write',
    create_service: 'services:write',
    update_service: 'services:write',
    create_doctor: 'doctors:write',
    update_doctor: 'doctors:write',
    update_clinic_settings: 'landing:write',
    list_treatment_plan: 'clinical:read',
    add_treatment_plan_item: 'clinical:write',
    record_tooth_condition: 'clinical:write',
    log_clinical_note: 'clinical:write',
    list_recalls: 'recalls:read',
    create_recall: 'recalls:write',
    list_waiting_list: 'waiting:read',
    add_to_waiting_list: 'waiting:write',
  };

  return Object.fromEntries(Object.entries(tools).filter(([name]) => can(ctx, capabilities[name]))) as ToolSet;
}
