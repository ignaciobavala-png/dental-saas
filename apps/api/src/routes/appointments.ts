import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';

const appointmentSchema = z.object({
  patient_id: z.string().nullable().optional(),
  doctor_id: z.string().nullable().optional(),
  service_id: z.string().nullable().optional(),
  operatory_id: z.string().nullable().optional(),
  starts_at: z.number().int(),
  ends_at: z.number().int(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  kind: z.enum(['patient', 'break', 'lunch', 'block']).optional(),
  notes: z.string().nullable().optional(),
});

export const appointments = new Hono<AppBindings>();

appointments.get('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'appointments:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ appointments: await db.list('appointments') });
});

appointments.post('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'appointments:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = appointmentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  try {
    const row = await db.insert('appointments', {
      patient_id: parsed.data.patient_id ?? null,
      doctor_id: parsed.data.doctor_id ?? null,
      service_id: parsed.data.service_id ?? null,
      operatory_id: parsed.data.operatory_id ?? null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      status: parsed.data.status ?? 'confirmed',
      kind: parsed.data.kind ?? 'patient',
      source: 'dashboard',
      notes: parsed.data.notes ?? null,
      created_at: Date.now(),
    } as never);
    return c.json({ appointment: row }, 201);
  } catch {
    return c.json({ error: 'Ese horario se acaba de ocupar.' }, 409);
  }
});

appointments.put('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'appointments:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = appointmentSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await db.update('appointments', c.req.param('id'), parsed.data);
  return c.json({ appointment: row });
});
