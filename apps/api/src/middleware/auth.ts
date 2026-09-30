import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { SESSION_COOKIE, usersRepo, verifySessionToken, type PlatformUser } from '@dental/core';
import type { AppBindings } from '../env';

export async function getSessionUser(c: Context<AppBindings>): Promise<PlatformUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const session = await verifySessionToken(c.env.DB, token);
  if (!session) return null;
  const user = await usersRepo(c.env.DB).byId(session.user_id);
  return user?.status === 'active' ? user : null;
}

export async function requireAuth(c: Context<AppBindings>, next: () => Promise<void>): Promise<Response | void> {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'No autenticado.' }, 401);
  c.set('user', user);
  return next();
}
