import { describe, expect, it } from 'vitest';
import { env as rawEnv } from 'cloudflare:test';
import { auditRepo, createTenantContext, TenantDb, type ClinicRole } from '@dental/core';
import type { Env } from '../src/env';
import {
  clinicalNoteService,
  idempotencyService,
  inquiryService,
  patientBundle,
  recallService,
  toothConditionService,
  treatmentPlanService,
  waitingService,
} from '../src/domain/services';
import { seedDemoClinic } from './helpers';

const env = rawEnv as unknown as Env;

function staffDb(clinicId: string, role: ClinicRole = 'admin') {
  return new TenantDb(createTenantContext({ clinicId, userId: 'user-1', role }), env.DB);
}

describe('núcleo clínico', () => {
  it('crea y lista items del plan de tratamiento', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const patient = await staffDb(db.clinicId).insert<{ id: string }>('patients', {
      full_name: 'Ana Gómez',
      created_at: Date.now(),
      deleted_at: null,
    } as never);

    const item = await treatmentPlanService.create(db, {
      patientId: patient.id,
      serviceId,
      tooth: '36',
      feeCents: 600000,
      notes: 'Conducto',
    });
    expect(item.status).toBe('planned');

    const updated = await treatmentPlanService.update(db, item.id, { status: 'accepted' });
    expect(updated.status).toBe('accepted');

    const list = await treatmentPlanService.listByPatient(db, patient.id);
    expect(list).toHaveLength(1);
  });

  it('un hallazgo por pieza/cara: el segundo reemplaza al primero', async () => {
    const { db } = await seedDemoClinic();
    const admin = staffDb(db.clinicId);
    const patient = await admin.insert<{ id: string }>('patients', { full_name: 'Ana', created_at: Date.now(), deleted_at: null } as never);

    await toothConditionService.record(db, { patientId: patient.id, tooth: '16', surface: 'O', condition: 'caries' });
    await toothConditionService.record(db, { patientId: patient.id, tooth: '16', surface: 'O', condition: 'restoration' });

    const list = await toothConditionService.listByPatient(db, patient.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.condition).toBe('restoration');
  });

  it('registra notas de evolución ordenadas por fecha', async () => {
    const { db } = await seedDemoClinic();
    const admin = staffDb(db.clinicId);
    const patient = await admin.insert<{ id: string }>('patients', { full_name: 'Ana', created_at: Date.now(), deleted_at: null } as never);

    await clinicalNoteService.create(db, { patientId: patient.id, body: 'Primera', noteDate: 1000 });
    await clinicalNoteService.create(db, { patientId: patient.id, body: 'Segunda', noteDate: 2000 });

    const notes = await clinicalNoteService.listByPatient(db, patient.id);
    expect(notes.map((n) => n.body)).toEqual(['Segunda', 'Primera']);
  });

  it('crea recalls y los lista abiertos con su fecha', async () => {
    const { db } = await seedDemoClinic();
    const admin = staffDb(db.clinicId);
    const patient = await admin.insert<{ id: string }>('patients', { full_name: 'Ana', created_at: Date.now(), deleted_at: null } as never);

    await recallService.create(db, { patientId: patient.id, dueAfter: '2026-11-01' });
    const open = await recallService.list(db, 'open');
    expect(open).toHaveLength(1);
    expect(open[0]?.due_after).toBe('2026-11-01');
  });

  it('crea lista de espera y consultas de la IA', async () => {
    const { db } = await seedDemoClinic();
    const admin = staffDb(db.clinicId);
    const patient = await admin.insert<{ id: string }>('patients', { full_name: 'Ana', created_at: Date.now(), deleted_at: null } as never);

    await waitingService.create(db, { patientId: patient.id, durationMin: 45 });
    expect(await waitingService.list(db, 'open')).toHaveLength(1);

    await inquiryService.create(db, { patientName: 'Florencia', topic: 'Blanqueamiento' });
    expect(await inquiryService.list(db, 'new')).toHaveLength(1);
  });

  it('arma la ficha completa del paciente en una sola llamada', async () => {
    const { db, serviceId } = await seedDemoClinic();
    const admin = staffDb(db.clinicId);
    const patient = await admin.insert<{ id: string }>('patients', { full_name: 'Ana', created_at: Date.now(), deleted_at: null } as never);

    await treatmentPlanService.create(db, { patientId: patient.id, serviceId });
    await clinicalNoteService.create(db, { patientId: patient.id, body: 'Control' });

    const bundle = await patientBundle(db, patient.id);
    expect(bundle.patient?.full_name).toBe('Ana');
    expect(bundle.plan).toHaveLength(1);
    expect(bundle.notes).toHaveLength(1);
  });
});

describe('idempotencia', () => {
  it('ejecuta la operación una sola vez por clave', async () => {
    const { db } = await seedDemoClinic();
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { ok: true, n: calls };
    };

    const first = await idempotencyService.once(db, 'k1', run);
    const second = await idempotencyService.once(db, 'k1', run);

    expect(calls).toBe(1);
    expect(first).toEqual({ ok: true, n: 1 });
    expect(second).toEqual({ ok: true, n: 1 });
  });
});

describe('auditoría', () => {
  it('registra y lista acciones por clínica', async () => {
    const { clinicId } = await seedDemoClinic();
    const repo = auditRepo(env.DB);

    await repo.record({ actorUserId: 'u1', actorType: 'ai', clinicId, action: 'book_appointment', entity: 'appointment', entityId: 'ap_1' });
    await repo.record({ actorUserId: 'u1', actorType: 'ai', clinicId, action: 'cancel_appointment', entity: 'appointment', entityId: 'ap_2' });

    const entries = await repo.listByClinic(clinicId);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.action)).toContain('book_appointment');
  });
});
