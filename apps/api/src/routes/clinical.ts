import { Hono } from 'hono';
import { z } from 'zod';
import { auditRepo, can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';
import {
  clinicalNoteService,
  inquiryService,
  recallService,
  toothConditionService,
  treatmentPlanService,
  waitingService,
} from '../domain/services';

const toothCondition = z.enum(['caries', 'restoration', 'crown', 'missing', 'implant', 'endo']);
const planStatus = z.enum(['planned', 'accepted', 'completed', 'declined']);
const recallStatus = z.enum(['open', 'scheduled', 'cancelled']);

export const clinical = new Hono<AppBindings>();

/* -------------------------------- Plan ---------------------------------- */

clinical.get('/treatment-plan', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'Falta patientId.' }, 400);
  return c.json({ items: await treatmentPlanService.listByPatient(db, patientId) });
});

clinical.post('/treatment-plan', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      patientId: z.string(),
      serviceId: z.string().nullable().optional(),
      tooth: z.string().nullable().optional(),
      surface: z.string().nullable().optional(),
      feeCents: z.number().int().optional(),
      status: planStatus.optional(),
      notes: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ item: await treatmentPlanService.create(db, parsed.data) }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

clinical.put('/treatment-plan/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      serviceId: z.string().nullable().optional(),
      tooth: z.string().nullable().optional(),
      surface: z.string().nullable().optional(),
      feeCents: z.number().int().optional(),
      status: planStatus.optional(),
      notes: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ item: await treatmentPlanService.update(db, c.req.param('id'), parsed.data) });
  } catch {
    return c.json({ error: 'No encontrado.' }, 404);
  }
});

clinical.delete('/treatment-plan/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);
  await treatmentPlanService.remove(db, c.req.param('id'));
  return c.json({ ok: true });
});

/* ---------------------------- Odontograma -------------------------------- */

clinical.get('/tooth-conditions', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'Falta patientId.' }, 400);
  return c.json({ conditions: await toothConditionService.listByPatient(db, patientId) });
});

clinical.post('/tooth-conditions', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      patientId: z.string(),
      tooth: z.string().min(1),
      surface: z.string().nullable().optional(),
      condition: toothCondition,
      recordedBy: z.string().nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  return c.json({ condition: await toothConditionService.record(db, parsed.data) }, 201);
});

clinical.delete('/tooth-conditions/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);
  await toothConditionService.remove(db, c.req.param('id'));
  return c.json({ ok: true });
});

/* ------------------------------ Evolución -------------------------------- */

clinical.get('/clinical-notes', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'Falta patientId.' }, 400);
  return c.json({ notes: await clinicalNoteService.listByPatient(db, patientId) });
});

clinical.post('/clinical-notes', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      patientId: z.string(),
      doctorId: z.string().nullable().optional(),
      body: z.string().min(1),
      noteDate: z.number().int().optional(),
      createdBy: z.string().nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ note: await clinicalNoteService.create(db, parsed.data) }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

clinical.delete('/clinical-notes/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'clinical:write')) return c.json({ error: 'No tenés permiso.' }, 403);
  await clinicalNoteService.remove(db, c.req.param('id'));
  return c.json({ ok: true });
});

/* ------------------------------- Recalls --------------------------------- */

clinical.get('/recalls', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'recalls:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ recalls: await recallService.list(db, c.req.query('status') ?? undefined) });
});

clinical.post('/recalls', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'recalls:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      patientId: z.string(),
      serviceId: z.string().nullable().optional(),
      dueAfter: z.string().nullable().optional(),
      source: z.enum(['reception', 'patient', 'system']).optional(),
      notes: z.string().nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ recall: await recallService.create(db, parsed.data) }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

clinical.put('/recalls/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'recalls:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      dueAfter: z.string().nullable().optional(),
      status: recallStatus.optional(),
      notes: z.string().nullable().optional(),
      serviceId: z.string().nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ recall: await recallService.update(db, c.req.param('id'), parsed.data) });
  } catch {
    return c.json({ error: 'No encontrado.' }, 404);
  }
});

/* ---------------------------- Lista de espera ---------------------------- */

clinical.get('/waiting-list', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'waiting:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ waiting: await waitingService.list(db, c.req.query('status') ?? undefined) });
});

clinical.post('/waiting-list', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'waiting:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      patientId: z.string(),
      serviceId: z.string().nullable().optional(),
      doctorId: z.string().nullable().optional(),
      durationMin: z.number().int().positive().optional(),
      notes: z.string().nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ item: await waitingService.create(db, parsed.data) }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

clinical.put('/waiting-list/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'waiting:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({
      status: recallStatus.optional(),
      notes: z.string().nullable().optional(),
      serviceId: z.string().nullable().optional(),
      doctorId: z.string().nullable().optional(),
      durationMin: z.number().int().positive().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ item: await waitingService.update(db, c.req.param('id'), parsed.data) });
  } catch {
    return c.json({ error: 'No encontrado.' }, 404);
  }
});

/* --------------------------- Consultas de la IA -------------------------- */

clinical.get('/ai-inquiries', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'conversations:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ inquiries: await inquiryService.list(db, c.req.query('status') ?? undefined) });
});

clinical.put('/ai-inquiries/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'conversations:read')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = z
    .object({ status: z.enum(['new', 'contacted', 'booked']) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    return c.json({ inquiry: await inquiryService.update(db, c.req.param('id'), parsed.data) });
  } catch {
    return c.json({ error: 'No encontrado.' }, 404);
  }
});

/* --------------------------------- Auditoría ----------------------------- */

clinical.get('/audit', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx } = tenant;
  if (!can(ctx, 'clinic:write')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ entries: await auditRepo(c.env.DB).listByClinic(ctx.clinicId) });
});
