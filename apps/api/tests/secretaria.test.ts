import { beforeEach, describe, expect, it } from 'vitest';
import { buildPublicTools, createAppointmentInput, getAvailableSlotsInput } from '../src/ai/tools';
import { publicVisitorContext } from '../src/ai/context';
import { resetStore } from '../src/domain/fixture';
import { availabilityService, bookingService } from '../src/domain/services';

const RANGE = { serviceId: 'svc_general', dateFrom: '2026-10-05', dateTo: '2026-10-11' };

describe('secretaría — boundary de tools', () => {
  beforeEach(() => resetStore());

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
    const result = getAvailableSlotsInput.safeParse({ ...RANGE, clinic_id: 'cl_otra' });
    expect(result.success).toBe(false);
  });

  it('el visitante recibe las tools públicas', () => {
    const tools = buildPublicTools(publicVisitorContext);
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
  beforeEach(() => resetStore());

  it('devuelve horarios para un rango con días de atención', () => {
    const slots = availabilityService.slots(RANGE);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('startsAt');
    expect(slots[0]).toHaveProperty('doctorId');
  });

  it('reserva un turno y lo lista', () => {
    const [slot] = availabilityService.slots(RANGE);
    const booking = bookingService.create({
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      patientName: 'Ana Gómez',
      phone: '+54 9 11 5555 5555',
    });

    expect(booking.status).toBe('pending');
    expect(bookingService.list()).toHaveLength(1);
  });

  it('rechaza reservar dos veces el mismo horario con el mismo profesional', () => {
    const [slot] = availabilityService.slots(RANGE);
    const input = {
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      patientName: 'Ana Gómez',
    };

    bookingService.create(input);
    expect(() => bookingService.create(input)).toThrow(/se acaba de ocupar/);
  });
});
