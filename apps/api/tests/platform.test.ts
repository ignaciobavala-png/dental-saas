import { describe, expect, it } from 'vitest';
import { env as rawEnv } from 'cloudflare:test';
import { clinicAccess, createSession, SESSION_COOKIE } from '@dental/core';
import app from '../src/index';
import type { Env } from '../src/env';
import { seedDemoClinic } from './helpers';

const env = rawEnv as unknown as Env;
const DAY = 86_400_000;

async function sessionFor(isPlatformAdmin: boolean) {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id,email,password_hash,name,status,is_platform_admin,created_at) VALUES (?,?,NULL,?, 'active', ?, ?)")
    .bind(id, `${id}@test.local`, 'Usuario', isPlatformAdmin ? 1 : 0, Date.now())
    .run();
  const { token } = await createSession(env.DB, id);
  return { Cookie: `${SESSION_COOKIE}=${token}`, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' };
}

const post = (path: string, headers: Record<string, string>, body: unknown = {}) =>
  app.request(path, { method: 'POST', headers, body: JSON.stringify(body) }, env);

describe('clinicAccess', () => {
  const now = Date.now();
  it('vence la prueba y el período pago', () => {
    expect(clinicAccess({ status: 'trial', trial_expires_at: now + DAY, paid_until: null }, now)).toBe('ok');
    expect(clinicAccess({ status: 'trial', trial_expires_at: now - 1, paid_until: null }, now)).toBe('trial_expired');
    expect(clinicAccess({ status: 'active', trial_expires_at: null, paid_until: now - 1 }, now)).toBe('payment_due');
    expect(clinicAccess({ status: 'active', trial_expires_at: null, paid_until: null }, now)).toBe('ok');
    expect(clinicAccess({ status: 'suspended', trial_expires_at: null, paid_until: now + DAY }, now)).toBe('suspended');
  });
});

describe('alta con email y contraseña', () => {
  it('crea la prueba por 30 días', async () => {
    const before = Date.now();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Doc', email: `${crypto.randomUUID()}@test.local`, password: 'clave-segura', clinicName: 'Consultorio Prueba'}),
    }, { ...env, TRIAL_DAYS: undefined });
    expect(res.status).toBe(200);
    const body = await res.json() as { clinic: { trialExpiresAt: number } };
    const days = (body.clinic.trialExpiresAt - before) / DAY;
    expect(days).toBeGreaterThanOrEqual(29.99);
    expect(days).toBeLessThan(30.01);
  });
});

describe('/api/platform', () => {
  it('rechaza a quien no es master', async () => {
    expect((await app.request('/api/platform/clinics', undefined, env)).status).toBe(401);
    const res = await app.request('/api/platform/clinics', { headers: await sessionFor(false) }, env);
    expect(res.status).toBe(403);
  });

  it('lista consultorios con su estado de acceso', async () => {
    const { slug } = await seedDemoClinic();
    const res = await app.request('/api/platform/clinics', { headers: await sessionFor(true) }, env);
    expect(res.status).toBe(200);
    const { clinics } = await res.json() as { clinics: Array<{ slug: string; access: string }> };
    expect(clinics.find((c) => c.slug === slug)?.access).toBe('ok');
  });

  it('suspende, y un pago reactiva la landing por 30 días', async () => {
    const { slug } = await seedDemoClinic();
    const clinic = await env.DB.prepare('SELECT id FROM clinics WHERE slug = ?').bind(slug).first<{ id: string }>();
    const headers = await sessionFor(true);

    expect((await post(`/api/platform/clinics/${clinic!.id}/suspend`, headers)).status).toBe(200);
    expect((await app.request(`/api/public/clinic/${slug}`, undefined, env)).status).toBe(404);

    const before = Date.now();
    const paid = await post(`/api/platform/clinics/${clinic!.id}/payment`, headers, { periods: 1 });
    expect(paid.status).toBe(200);
    const { paidUntil } = await paid.json() as { paidUntil: number };
    expect(Math.round((paidUntil - before) / DAY)).toBe(30);
    expect((await app.request(`/api/public/clinic/${slug}`, undefined, env)).status).toBe(200);

    await env.DB.prepare('UPDATE clinics SET paid_until = ? WHERE id = ?').bind(Date.now() - 1, clinic!.id).run();
    expect((await app.request(`/api/public/clinic/${slug}`, undefined, env)).status).toBe(404);
  });

  it('extiende una prueba vencida', async () => {
    const { slug } = await seedDemoClinic();
    await env.DB.prepare("UPDATE clinics SET status = 'trial', trial_expires_at = ? WHERE slug = ?").bind(Date.now() - DAY, slug).run();
    const clinic = await env.DB.prepare('SELECT id FROM clinics WHERE slug = ?').bind(slug).first<{ id: string }>();
    expect((await app.request(`/api/public/clinic/${slug}`, undefined, env)).status).toBe(404);

    const res = await post(`/api/platform/clinics/${clinic!.id}/trial`, await sessionFor(true), { days: 7 });
    expect(res.status).toBe(200);
    expect((await app.request(`/api/public/clinic/${slug}`, undefined, env)).status).toBe(200);
  });
});
