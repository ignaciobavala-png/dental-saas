import { Hono } from 'hono';
import { z } from 'zod';
import { can } from '@dental/core';
import type { AppBindings } from '../env';
import { requireTenant } from '../lib/request-context';

const contentSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  openingHours: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), openMin: z.number().int().min(0).max(1439), closeMin: z.number().int().min(1).max(1440) }).refine((h) => h.closeMin > h.openMin))
    .optional(),
  slotMinutes: z.number().int().min(5).max(240).optional(),
  obrasSociales: z.array(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  testimonials: z.array(z.object({ name: z.string(), text: z.string() })).optional(),
});

const settingsSchema = z.object({
  content: contentSchema,
  theme: z.record(z.string(), z.unknown()).optional(),
});

type ClinicSettingsRow = {
  clinic_id: string;
  timezone: string;
  locale: string;
  contact_json: string | null;
  theme_json: string | null;
  content_json: string | null;
  updated_at: number;
};

export const clinic = new Hono<AppBindings>();

clinic.get('/settings', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'landing:read')) return c.json({ error: 'No tenés permiso.' }, 403);

  const row = await db.get<ClinicSettingsRow>('clinic_settings', ctx.clinicId);
  return c.json({
    content: row?.content_json ? JSON.parse(row.content_json) : null,
    theme: row?.theme_json ? JSON.parse(row.theme_json) : null,
  });
});

clinic.put('/settings', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;
  if (!can(ctx, 'landing:write')) return c.json({ error: 'No tenés permiso.' }, 403);

  const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.', details: parsed.error.flatten() }, 400);

  const patch: Record<string, unknown> = {
    content_json: JSON.stringify(parsed.data.content),
    updated_at: Date.now(),
  };
  if (parsed.data.theme) patch.theme_json = JSON.stringify(parsed.data.theme);

  await db.update('clinic_settings', ctx.clinicId, patch);

  return c.json({ ok: true });
});
