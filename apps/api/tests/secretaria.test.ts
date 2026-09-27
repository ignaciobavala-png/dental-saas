import { describe, expect, it } from 'vitest';
import { buildPublicTools, createAppointmentInput, getAvailableSlotsInput } from '../src/ai/tools';
import { availabilityService, bookingService } from '../src/domain/services';
import { seedDemoClinic } from './helpers';

describe('secretaría — boundary de tools', () => {
  it('el inputSchema de create_appointment rechaza un clinic_id inyectado', () => {
    const result = createAppointmentInput.safeParse({
      clinicId: 'cl_otra',
      serviceId: 'svc_general',
      doctorId: 'doc_malena',
      startsAt: new Date().toISOString(),
      patient: { fullName: 'Juan Pérez' },
    });

    expect(result.success).toBe(false);
  });

  it('get_available_slots también rechaza un clinic_id en los args', () => {
    const result = getAvailableSlotsInput.safeParse({
      serviceId: 'svc_general',
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
      clinic_id: 'cl_otra',
    });
    expect(result.success).toBe(false);
  });

  it('el visitante recibe las tools públicas', async () => {
    const { ctx, db } = await seedDemoClinic();
    const tools = buildPublicTools(ctx, db);
    expect(Object.keys(tools).sort()).toEqual([
      'create_appointment',
      'get_available_slots',
      'get_clinic_information',
      'get_doctors',
      'get_services',
    ]);
  });
});

describe('secretaría — disponibilidad y reserva', () => {
  it('devuelve horarios para un rango con días de atención', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const slots = await availabilityService.slots(db, {
      serviceId,
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('startsAt');
    expect(slots[0]).toHaveProperty('doctorId');
  });

  it('reserva un turno y lo lista', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const [slot] = await availabilityService.slots(db, {
      serviceId,
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
    });

    const booking = await bookingService.create(db, {
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      patientName: 'Ana Gómez',
      phone: '+54 9 11 5555 5555',
    });

    expect(booking.status).toBe('pending');
    expect(await bookingService.list(db)).toHaveLength(1);
  });

  it('rechaza reservar dos veces el mismo horario con el mismo profesional', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const [slot] = await availabilityService.slots(db, {
      serviceId,
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
    });
    const input = {
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      patientName: 'Ana Gómez',
    };

    await bookingService.create(db, input);
    await expect(bookingService.create(db, input)).rejects.toThrow(/se acaba de ocupar/);
  });
});
