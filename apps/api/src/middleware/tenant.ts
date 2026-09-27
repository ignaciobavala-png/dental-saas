import type { Context } from 'hono';
import { createTenantContext, membershipsRepo, TenantDb, type PlatformUser, type TenantContext } from '@dental/core';
import type { AppBindings } from '../env';

/**
 * Resuelve la clínica activa para un usuario autenticado.
 * El selector del cliente (`?clinic=`) solo se usa si el usuario pertenece a esa
 * clínica; nunca se confía en él como autoridad (docs/02 §4.1).
 */
export async function resolveTenantContext(
  c: Context<AppBindings>,
  user: PlatformUser,
): Promise<TenantContext | null> {
  const memberships = await membershipsRepo(c.env.DB).listByUser(user.id);
  if (memberships.length === 0) return null;

  const requested = c.req.query('clinic');
  const membership = requested ? memberships.find((m) => m.clinic_id === requested) ?? memberships[0] : memberships[0];

  return createTenantContext({ clinicId: membership.clinic_id, userId: user.id, role: membership.role });
}

export function tenantDbFor(c: Context<AppBindings>, ctx: TenantContext): TenantDb {
  return new TenantDb(ctx, c.env.DB);
}
