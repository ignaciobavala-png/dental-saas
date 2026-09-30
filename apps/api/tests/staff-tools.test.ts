import { describe, expect, it } from 'vitest';
import { env as rawEnv } from 'cloudflare:test';
import { createTenantContext, TenantDb, type ClinicRole } from '@dental/core';
import type { Env } from '../src/env';
import { bookAppointmentInput, buildStaffTools, createPatientInput } from '../src/ai/tools';
import { availabilityService, bookingService, catalogService, clinicService, patientsService } from '../src/domain/services';
import { seedDemoClinic } from './helpers';

const env = rawEnv as unknown as Env;

function staffDb(clinicId: string, role: ClinicRole) {
  return new TenantDb(createTenantContext({ clinicId, userId: 'user-1', role }), env.DB);
}

describe('copiloto interno — filtrado de tools por rol', () => {
  it('el admin recibe las tools de escritura de todo el mostrador', async () => {
    const { clinicId } = await seedDemoClinic();
    const tools = buildStaffTools(createTenantContext({ clinicId, userId: 'u', role: 'admin' }), staffDb(clinicId, 'admin'));
    const keys = Object.keys(tools);

    expect(keys).toContain('create_service');
    expect(keys).toContain('update_service');
    expect(keys).toContain('create_doctor');
    expect(keys).toContain('update_clinic_settings');
    expect(keys).toContain('get_agenda');
    expect(keys).toContain('book_appointment');
    expect(keys).toContain('reschedule_appointment');
    expect(keys).toContain('cancel_appointment');
    expect(keys).toContain('find_patient');
  });

  it('la recepcionista da turnos y pacientes, pero no toca el catálogo ni la configuración', async () => {
    const { clinicId } = await seedDemoClinic();
    const tools = buildStaffTools(
      createTenantContext({ clinicId, userId: 'u', role: 'receptionist' }),
      staffDb(clinicId, 'receptionist'),
    );
    const keys = Object.keys(tools);

    expect(keys).toContain('find_patient');
    expect(keys).toContain('create_patient');
    expect(keys).toContain('book_appointment');
    expect(keys).toContain('reschedule_appointment');
    expect(keys).toContain('cancel_appointment');
    expect(keys).toContain('get_agenda');

    expect(keys).not.toContain('create_service');
    expect(keys).not.toContain('update_service');
    expect(keys).not.toContain('update_clinic_settings');
  });

  it('el dentista edita profesionales pero no el catálogo de tratamientos ni la landing', async () => {
    const { clinicId } = await seedDemoClinic();
    const tools = buildStaffTools(
      createTenantContext({ clinicId, userId: 'u', role: 'dentist' }),
      staffDb(clinicId, 'dentist'),
    );
    const keys = Object.keys(tools);

    expect(keys).toContain('update_doctor');
    expect(keys).not.toContain('create_service');
    expect(keys).not.toContain('update_service');
    expect(keys).not.toContain('update_clinic_settings');
  });

  it('el visitante sólo recibe las lecturas públicas', async () => {
    const { clinicId } = await seedDemoClinic();
    const tools = buildStaffTools(
      createTenantContext({ clinicId, userId: null, role: 'visitor' }),
      staffDb(clinicId, 'visitor'),
    );
    expect(Object.keys(tools).sort()).toEqual([
      'get_available_slots',
      'get_clinic_information',
      'get_doctors',
      'get_services',
    ]);
  });
});

describe('copiloto interno — schemas estrictos', () => {
  it('book_appointment rechaza un clinicId inyectado', () => {
    const result = bookAppointmentInput.safeParse({
      clinicId: 'cl_otra',
      serviceId: 'svc_1',
      doctorId: 'doc_1',
      startsAt: new Date().toISOString(),
      patient: { fullName: 'Juan Pérez' },
    });
    expect(result.success).toBe(false);
  });

  it('create_patient rechaza un clinic_id inyectado', () => {
    const result = createPatientInput.safeParse({ clinic_id: 'cl_otra', fullName: 'Juan Pérez' });
    expect(result.success).toBe(false);
  });
});

describe('copiloto interno — operaciones de mostrador', () => {
  it('busca pacientes por nombre y no duplica la ficha', async () => {
    const { db } = await seedDemoClinic();
    await patientsService.create(db, { fullName: 'Ana Gómez', phone: '+54 9 11 5555 5555' });

    const found = await patientsService.search(db, 'Gómez');
    expect(found).toHaveLength(1);
    expect(found[0]?.full_name).toBe('Ana Gómez');

    const byPhone = await patientsService.search(db, '5555');
    expect(byPhone.map((p) => p.id)).toContain(found[0]?.id);
  });

  it('reserva para un paciente existente y lo deja confirmado en la agenda', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const patient = await patientsService.create(db, { fullName: 'Ana Gómez' });
    const [slot] = await availabilityService.slots(db, {
      serviceId,
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
    });

    const booking = await bookingService.create(db, {
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      patientId: patient.id,
      status: 'confirmed',
    });
    expect(booking.patientId).toBe(patient.id);
    expect(booking.status).toBe('confirmed');

    const agenda = await bookingService.agenda(db, { dateFrom: '2026-10-05', dateTo: '2026-10-11' });
    const item = agenda.find((a) => a.id === booking.id);
    expect(item?.patientName).toBe('Ana Gómez');
    expect(item?.serviceName).toBe('Odontología general');
    expect(item?.status).toBe('confirmed');
  });

  it('reprograma un turno a otro horario del mismo profesional', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const slots = await availabilityService.slots(db, {
      serviceId,
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
    });
    const target = slots.find((s) => s.doctorId === slots[0].doctorId && s.startsAt !== slots[0].startsAt);
    expect(target).toBeDefined();

    const booking = await bookingService.create(db, {
      serviceId: slots[0].serviceId,
      doctorId: slots[0].doctorId,
      startsAt: slots[0].startsAt,
      patientName: 'Ana Gómez',
    });

    const moved = await bookingService.reschedule(db, { id: booking.id, startsAt: target!.startsAt });
    expect(moved.startsAt).toBe(new Date(target!.startsAt).toISOString());
  });

  it('cancela un turno y lo marca en la agenda', async () => {
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
    });

    const cancelled = await bookingService.cancel(db, { id: booking.id, reason: 'El paciente avisó' });
    expect(cancelled.status).toBe('cancelled');

    const agenda = await bookingService.agenda(db, {
      dateFrom: '2026-10-05',
      dateTo: '2026-10-11',
      status: 'cancelled',
    });
    expect(agenda.map((a) => a.id)).toContain(booking.id);
  });

  it('da de alta y modifica un tratamiento', async () => {
    const { db } = await seedDemoClinic();
    const service = await catalogService.createService(db, {
      name: 'Blanqueamiento',
      durationMin: 60,
      priceCents: 500000,
    });
    expect(service.name).toBe('Blanqueamiento');
    expect(service.active).toBe(1);

    const updated = await catalogService.updateService(db, service.id as string, {
      priceCents: 600000,
      color: 'pink',
    });
    expect(updated.price_cents).toBe(600000);
    expect(updated.color).toBe('pink');
  });

  it('da de alta un profesional y le asigna tratamientos', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const doctor = await catalogService.createDoctor(db, {
      name: 'Dr. Nuevo',
      specialty: 'Ortodoncia',
      serviceIds: [serviceId],
    });
    expect(doctor.serviceIds).toEqual([serviceId]);

    const updated = await catalogService.updateDoctor(db, doctor.id, { specialty: 'Endodoncia' });
    expect(updated?.specialty).toBe('Endodoncia');
  });

  it('actualiza la configuración fusionando con lo que ya había', async () => {
    const { db } = await seedDemoClinic();
    const merged = await clinicService.updateContent(db, { phone: '+54 11 0000 0000' });

    expect(merged.phone).toBe('+54 11 0000 0000');
    expect(merged.name).toBe('Odontología Arocena');
    expect(merged.address).toBe('Av. Rivadavia 4820, Caballito, CABA');
  });
});
