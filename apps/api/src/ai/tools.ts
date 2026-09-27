import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { TenantDb, TenantContext, Capability } from '@dental/core';
import { can } from '@dental/core';
import { availabilityService, bookingService, catalogService, clinicService } from '../domain/services';

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
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
});

export function buildPublicTools(ctx: TenantContext, db: TenantDb): ToolSet {
  const tools: ToolSet = {
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
    create_appointment: tool({
      description:
        'Reserva un turno. Necesita el id del servicio, el del profesional, un horario devuelto por get_available_slots y el nombre del paciente con un contacto.',
      inputSchema: createAppointmentInput,
      execute: async (input) => {
        try {
          const appointment = await bookingService.create(db, {
            serviceId: input.serviceId,
            doctorId: input.doctorId,
            startsAt: input.startsAt,
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
