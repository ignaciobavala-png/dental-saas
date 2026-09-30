import type { Context } from 'hono';
import { clinicsRepo, TenantDb, type TenantContext } from '@dental/core';
import type { AppBindings } from '../env';
import { getSessionUser } from '../middleware/auth';
import { resolveTenantContext } from '../middleware/tenant';

export async function requireTenant(
  c: Context<AppBindings>,
): Promise<{ ctx: TenantContext; db: TenantDb } | Response> {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'No autenticado.' }, 401);

  const ctx = await resolveTenantContext(c, user);
  if (!ctx) return c.json({ error: 'No pertenecés a ningún consultorio.' }, 403);
  const clinic = await clinicsRepo(c.env.DB).byId(ctx.clinicId);
  if (clinic?.status === 'suspended' || (clinic?.status === 'trial' && clinic.trial_expires_at != null && clinic.trial_expires_at <= Date.now())) {
    return c.json({ error: 'El acceso de este consultorio está pausado o venció la prueba. Escribinos para continuar.' }, 402);
  }

  return { ctx, db: new TenantDb(ctx, c.env.DB) };
}
