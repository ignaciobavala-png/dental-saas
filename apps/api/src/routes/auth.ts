import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  clinicAccess,
  clinicsRepo,
  daysFromNow,
  createSession,
  destroySessionToken,
  hashPassword,
  membershipsRepo,
  SESSION_COOKIE,
  trialDaysFrom,
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
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  clinicName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
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
  const user = { id: crypto.randomUUID(), name, email };
  const clinic = { id: crypto.randomUUID(), name: clinicName, slug };
  const now = Date.now();
  const trialExpiresAt = daysFromNow(trialDaysFrom(c.env.TRIAL_DAYS), now);
  const content = {
    name: clinicName,
    openingHours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, openMin: 540, closeMin: 1140 })),
    slotMinutes: 30, obrasSociales: [], faqs: [], testimonials: [],
  };
  // D1 batch is transactional: a failed provision cannot leave a half-created account.
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO users (id,email,password_hash,name,status,created_at) VALUES (?,?,?,?,'active',?)").bind(user.id,email,passwordHash,name,now),
      c.env.DB.prepare("INSERT INTO clinics (id,name,slug,status,created_at,trial_expires_at) VALUES (?,?,?,'trial',?,?)").bind(clinic.id,clinicName,slug,now,trialExpiresAt),
      c.env.DB.prepare("INSERT INTO memberships (id,user_id,clinic_id,role,status,created_at) VALUES (?,?,?,'owner','active',?)").bind(crypto.randomUUID(),user.id,clinic.id,now),
      c.env.DB.prepare("INSERT INTO clinic_settings (clinic_id,content_json,updated_at) VALUES (?,?,?)").bind(clinic.id,JSON.stringify(content),now),
      ...SEED_SERVICES.map((service) => c.env.DB.prepare("INSERT INTO services (id,clinic_id,name,duration_min,color,active,created_at) VALUES (?,?,?,?,?,1,?)").bind(crypto.randomUUID(),clinic.id,service.name,service.duration_min,service.color,now)),
    ]);
  } catch (error) {
    if (String(error).includes('UNIQUE')) return c.json({ error: 'Ese email o nombre de consultorio ya está en uso. Intentá nuevamente.' }, 409);
    throw error;
  }

  const { token } = await createSession(c.env.DB, user.id);
  await setSessionCookie(c, token);

  return c.json({ user: { id: user.id, name: user.name, email: user.email }, clinic: { id: clinic.id, slug: clinic.slug, name: clinic.name, trialExpiresAt } });
});

auth.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Datos inválidos.' }, 400);

  const user = await usersRepo(c.env.DB).byEmail(parsed.data.email);
  if (user?.status !== 'active' || !user?.password_hash || !(await verifyPassword(parsed.data.password, user.password_hash))) {
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
    memberships.map(async (m) => {
      const clinic = await clinics.byId(m.clinic_id);
      return { ...m, clinic: clinic ? { ...clinic, trialExpiresAt: clinic.trial_expires_at, paidUntil: clinic.paid_until, access: clinicAccess(clinic), publicUrl: c.env.PUBLIC_LANDING_URL ? `${c.env.PUBLIC_LANDING_URL.replace(/\/$/, '')}/c/${clinic.slug}` : null } : null };
    }),
  );
  return c.json({
    user: { id: user.id, name: user.name, email: user.email, isPlatformAdmin: user.is_platform_admin === 1 },
    memberships: withClinic,
  });
});
