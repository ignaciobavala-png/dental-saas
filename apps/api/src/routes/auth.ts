import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  clinicsRepo,
  createSession,
  createTenantContext,
  destroySessionToken,
  domainsRepo,
  hashPassword,
  membershipsRepo,
  SESSION_COOKIE,
  TenantDb,
  usersRepo,
  verifyPassword,
} from '@dental/core';
import type { AppBindings } from '../env';
import { getSessionUser } from '../middleware/auth';
import { uniqueSlug } from '../lib/slug';

const SEED_SERVICES = [
  { name: 'Odontología general', duration_min: 45, color: 'sky' },
  { name: 'Limpieza', duration_min: 30, color: 'emerald' },
  { name: 'Blanqueamiento', duration_min: 60, color: 'pink' },
  { name: 'Ortodoncia', duration_min: 30, color: 'violet' },
  { name: 'Implantes', duration_min: 60, color: 'amber' },
  { name: 'Endodoncia', duration_min: 60, color: 'orange' },
];

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  clinicName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const auth = new Hono<AppBindings>();

function isSecureRequest(c: import('hono').Context<AppBindings>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

async function setSessionCookie(c: import('hono').Context<AppBindings>, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

auth.post('/signup', async (c) => {
  const parsed = signupSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);
  const { name, email, password, clinicName } = parsed.data;

  const users = usersRepo(c.env.DB);
  if (await users.byEmail(email)) {
    return c.json({ error: 'Ese email ya tiene una cuenta.' }, 409);
  }

  const clinics = clinicsRepo(c.env.DB);
  const slug = await uniqueSlug(clinicName, async (candidate) => Boolean(await clinics.bySlug(candidate)));

  const passwordHash = await hashPassword(password);
  const user = await users.create({ email, passwordHash, name });
  const clinic = await clinics.create({ name: clinicName, slug });
  await membershipsRepo(c.env.DB).create({ userId: user.id, clinicId: clinic.id, role: 'owner' });
  await domainsRepo(c.env.DB).create({
    hostname: `${slug}.nuestrosaas.com`,
    clinicId: clinic.id,
    kind: 'subdomain',
  });

  const ctx = createTenantContext({ clinicId: clinic.id, userId: user.id, role: 'owner' });
  const db = new TenantDb(ctx, c.env.DB);

  await db.insert('clinic_settings', {
    timezone: 'America/Argentina/Buenos_Aires',
    locale: 'es-AR',
    contact_json: null,
    theme_json: null,
    content_json: JSON.stringify({
      name: clinicName,
      openingHours: [
        { weekday: 1, openMin: 540, closeMin: 1140 },
        { weekday: 2, openMin: 540, closeMin: 1140 },
        { weekday: 3, openMin: 540, closeMin: 1140 },
        { weekday: 4, openMin: 540, closeMin: 1140 },
        { weekday: 5, openMin: 540, closeMin: 1140 },
      ],
      slotMinutes: 30,
      obrasSociales: [],
      faqs: [],
      testimonials: [],
    }),
    updated_at: Date.now(),
  });

  for (const service of SEED_SERVICES) {
    await db.insert('services', {
      code: null,
      name: service.name,
      description: null,
      duration_min: service.duration_min,
      price_cents: null,
      color: service.color,
      active: 1,
      created_at: Date.now(),
    });
  }

  const { token } = await createSession(c.env.DB, user.id);
  await setSessionCookie(c, token);

  return c.json({ user: { id: user.id, name: user.name, email: user.email }, clinic: { id: clinic.id, slug: clinic.slug, name: clinic.name } });
});

auth.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const user = await usersRepo(c.env.DB).byEmail(parsed.data.email);
  if (!user?.password_hash || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return c.json({ error: 'Email o contraseña incorrectos.' }, 401);
  }

  const { token } = await createSession(c.env.DB, user.id);
  await setSessionCookie(c, token);
  return c.json({ user: { id: user.id, name: user.name, email: user.email } });
});

auth.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await destroySessionToken(c.env.DB, token);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ user: null, memberships: [] });
  const memberships = await membershipsRepo(c.env.DB).listByUser(user.id);
  const clinics = clinicsRepo(c.env.DB);
  const withClinic = await Promise.all(
    memberships.map(async (m) => ({ ...m, clinic: await clinics.byId(m.clinic_id) })),
  );
  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
    memberships: withClinic,
  });
});
