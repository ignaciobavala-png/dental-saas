import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';
import { catalogService } from '../domain/services';

const serviceSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  duration_min: z.number().int().positive(),
  price_cents: z.number().int().nullable().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

export const services = new Hono<AppBindings>();

services.get('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'services:read')) return c.json({ error: 'No tenés permiso.' }, 403);
  return c.json({ services: await db.list('services') });
});

services.post('/', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'services:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = serviceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await catalogService.createService(db, {
    code: parsed.data.code ?? null,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    durationMin: parsed.data.duration_min,
    priceCents: parsed.data.price_cents ?? null,
    color: parsed.data.color,
    active: parsed.data.active,
  });

  return c.json({ service: row }, 201);
});

services.put('/:id', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'services:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = serviceSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const row = await catalogService.updateService(db, c.req.param('id'), {
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    durationMin: parsed.data.duration_min,
    priceCents: parsed.data.price_cents,
    color: parsed.data.color,
    active: parsed.data.active,
  });
  return c.json({ service: row });
});
