import { Hono } from 'hono';
import { z } from 'zod';
import { auditRepo, clinicAccess, clinicsRepo, daysFromNow, nextPaidUntil, platformRepo } from '@dental/core';
import type { AppBindings } from '../env';
import { getSessionUser } from '../middleware/auth';

/**
 * Consola del master de la plataforma: ve todos los consultorios y decide su
 * acceso (extender prueba, registrar pago, suspender). Solo para usuarios con
 * `is_platform_admin = 1`; no pasa por TenantContext porque cruza clínicas.
 */
export const platform = new Hono<AppBindings>();

platform.use('*', async (c, next) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'No autenticado.' }, 401);
  if (user.is_platform_admin !== 1) return c.json({ error: 'No tenés permisos de administración.' }, 403);
  c.set('user', user);
  await next();
});

platform.get('/clinics', async (c) => {
  const now = Date.now();
  const clinics = await platformRepo(c.env.DB).listClinics();
  return c.json({
    clinics: clinics.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      status: clinic.status,
      access: clinicAccess(clinic, now),
      trialExpiresAt: clinic.trial_expires_at,
      paidUntil: clinic.paid_until,
      createdAt: clinic.created_at,
      ownerName: clinic.owner_name,
      ownerEmail: clinic.owner_email,
    })),
  });
});

const trialSchema = z.object({ days: z.number().int().min(1).max(365) });
const paymentSchema = z.object({ periods: z.number().int().min(1).max(12).default(1) });

async function loadClinic(c: import('hono').Context<AppBindings>) {
  return clinicsRepo(c.env.DB).byId(c.req.param('id') ?? '');
}

async function audit(c: import('hono').Context<AppBindings>, clinicId: string, action: string, meta: unknown) {
  await auditRepo(c.env.DB).record({
    actorUserId: c.get('user')?.id ?? null,
    actorType: 'user',
    clinicId,
    action,
    entity: 'clinic',
    entityId: clinicId,
    meta,
  });
}

platform.post('/clinics/:id/trial', async (c) => {
  const parsed = trialSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Indicá entre 1 y 365 días.' }, 400);
  const clinic = await loadClinic(c);
  if (!clinic) return c.json({ error: 'Consultorio inexistente.' }, 404);

  const now = Date.now();
  const from = clinic.status === 'trial' ? Math.max(now, clinic.trial_expires_at ?? now) : now;
  const trialExpiresAt = daysFromNow(parsed.data.days, from);
  await platformRepo(c.env.DB).setTrial(clinic.id, trialExpiresAt);
  await audit(c, clinic.id, 'platform.trial_extended', { days: parsed.data.days, trialExpiresAt });
  return c.json({ ok: true, trialExpiresAt });
});

platform.post('/clinics/:id/payment', async (c) => {
  const parsed = paymentSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Cantidad de meses inválida.' }, 400);
  const clinic = await loadClinic(c);
  if (!clinic) return c.json({ error: 'Consultorio inexistente.' }, 404);

  const paidUntil = nextPaidUntil(clinic.paid_until, parsed.data.periods);
  await platformRepo(c.env.DB).setPaid(clinic.id, paidUntil);
  await audit(c, clinic.id, 'platform.payment_registered', { periods: parsed.data.periods, paidUntil });
  return c.json({ ok: true, paidUntil });
});

platform.post('/clinics/:id/suspend', async (c) => {
  const clinic = await loadClinic(c);
  if (!clinic) return c.json({ error: 'Consultorio inexistente.' }, 404);
  await platformRepo(c.env.DB).suspend(clinic.id);
  await audit(c, clinic.id, 'platform.suspended', null);
  return c.json({ ok: true });
});
