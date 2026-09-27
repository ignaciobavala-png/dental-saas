import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';

const patientSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  birthdate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const patients = new Hono<AppBindings>();

patients.get('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'patients:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ patients: await db.list('patients') });
});

patients.get('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'patients:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  const row = await db.get('patients', c.req.param('id'));
  if (!row) return c.json({ error: 'No encontrado.' }, 404);
  return c.json({ patient: row });
});

patients.post('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'patients:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = patientSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await db.insert('patients', {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    document: parsed.data.document ?? null,
    birthdate: parsed.data.birthdate ?? null,
    notes: parsed.data.notes ?? null,
    created_at: Date.now(),
  } as never);

  return c.json({ patient: row }, 201);
});

patients.put('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'patients:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = patientSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await db.update('patients', c.req.param('id'), parsed.data);
  return c.json({ patient: row });
});
