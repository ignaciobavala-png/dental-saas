import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';
import { catalogService } from '../domain/services';

const doctorSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export const doctors = new Hono<AppBindings>();

doctors.get('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'doctors:read')) return c.json({ error: 'No tenés permiso.' }, 403);

  const rows = await db.list('doctors');
  const links = await db.scoped<{ doctor_id: string; service_id: string }>({
    sql: 'SELECT doctor_id, service_id FROM doctor_services WHERE clinic_id = ?',
    args: [db.clinicId],
  });
  const byDoctor = new Map<string, string[]>();
  for (const link of links) {
    const list = byDoctor.get(link.doctor_id) ?? [];
    list.push(link.service_id);
    byDoctor.set(link.doctor_id, list);
  }
  return c.json({ doctors: rows.map((d: any) => ({ ...d, serviceIds: byDoctor.get(d.id) ?? [] })) });
});

doctors.post('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'doctors:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = doctorSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await catalogService.createDoctor(db, {
    name: parsed.data.name,
    specialty: parsed.data.specialty ?? null,
    bio: parsed.data.bio ?? null,
    photoUrl: parsed.data.photo_url ?? null,
    active: parsed.data.active,
    serviceIds: parsed.data.serviceIds,
  });

  return c.json({ doctor: row }, 201);
});

doctors.put('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'doctors:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = doctorSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await catalogService.updateDoctor(db, c.req.param('id'), {
    name: parsed.data.name,
    specialty: parsed.data.specialty,
    bio: parsed.data.bio,
    photoUrl: parsed.data.photo_url,
    active: parsed.data.active,
    serviceIds: parsed.data.serviceIds,
  });
  if (!row) return c.json({ error: 'No encontrado.' }, 404);

  return c.json({ doctor: row });
});
