import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';

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
  const { serviceIds, ...rest } = parsed.data;

  const row = await db.insert<{ id: string }>('doctors', {
    name: rest.name,
    specialty: rest.specialty ?? null,
    bio: rest.bio ?? null,
    photo_url: rest.photo_url ?? null,
    active: rest.active === false ? 0 : 1,
    created_at: Date.now(),
  } as never);

  for (const serviceId of serviceIds ?? []) {
    await db.scoped({
      sql: 'INSERT INTO doctor_services (clinic_id, doctor_id, service_id) VALUES (?, ?, ?)',
      args: [db.clinicId, row.id, serviceId],
    });
  }

  return c.json({ doctor: { ...row, serviceIds: serviceIds ?? [] } }, 201);
});

doctors.put('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'doctors:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = doctorSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);
  const { serviceIds, ...rest } = parsed.data;
  const id = c.req.param('id');

  const patch: Record<string, unknown> = {};
  if (rest.name !== undefined) patch.name = rest.name;
  if (rest.specialty !== undefined) patch.specialty = rest.specialty;
  if (rest.bio !== undefined) patch.bio = rest.bio;
  if (rest.photo_url !== undefined) patch.photo_url = rest.photo_url;
  if (rest.active !== undefined) patch.active = rest.active ? 1 : 0;

  const row = Object.keys(patch).length > 0 ? await db.update('doctors', id, patch) : await db.get('doctors', id);
  if (!row) return c.json({ error: 'No encontrado.' }, 404);

  if (serviceIds) {
    await db.scoped({ sql: 'DELETE FROM doctor_services WHERE clinic_id = ? AND doctor_id = ?', args: [db.clinicId, id] });
    for (const serviceId of serviceIds) {
      await db.scoped({
        sql: 'INSERT INTO doctor_services (clinic_id, doctor_id, service_id) VALUES (?, ?, ?)',
        args: [db.clinicId, id, serviceId],
      });
    }
  }

  return c.json({ doctor: row });
});
