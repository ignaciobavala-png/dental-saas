import type { Context } from 'hono';
import { TenantDb, type TenantContext } from '@dental/core';
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

  return { ctx, db: new TenantDb(ctx, c.env.DB) };
}
