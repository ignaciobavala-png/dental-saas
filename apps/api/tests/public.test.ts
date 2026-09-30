import { describe, expect, it } from 'vitest';
import { env as rawEnv } from 'cloudflare:test';
import app from '../src/index';
import type { Env } from '../src/env';
import { seedDemoClinic } from './helpers';

const env = rawEnv as unknown as Env;

describe('GET /api/public/clinic/:slug', () => {
  it('devuelve la proyección pública del consultorio', async () => {
    const { slug, serviceId, doctorId } = await seedDemoClinic();

    const res = await app.request(`/api/public/clinic/${slug}`, undefined, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown> & {
      services: Array<Record<string, unknown>>;
      doctors: Array<Record<string, unknown> & { serviceIds: string[] }>;
      obrasSociales: string[];
    };

    expect(body.slug).toBe(slug);
    expect(body.name).toBe('Odontología Arocena');
    expect(body.services.map((s) => s.id)).toContain(serviceId);
    expect(body.doctors[0]?.id).toBe(doctorId);
    expect(body.doctors[0]?.serviceIds).toContain(serviceId);
    expect(body.obrasSociales).toContain('OSDE');

    // No filtra la columna de tenancy ni datos internos.
    expect(body).not.toHaveProperty('clinic_id');
    expect(body.services[0]).not.toHaveProperty('clinic_id');
    expect(body.doctors[0]).not.toHaveProperty('clinic_id');
  });

  it('responde 404 si el consultorio no existe', async () => {
    const res = await app.request('/api/public/clinic/no-existe-xyz', undefined, env);
    expect(res.status).toBe(404);
  });

  it('responde 404 si el consultorio está suspendido', async () => {
    const { slug } = await seedDemoClinic();
    await env.DB.prepare("UPDATE clinics SET status = 'suspended' WHERE slug = ?").bind(slug).run();

    const res = await app.request(`/api/public/clinic/${slug}`, undefined, env);
    expect(res.status).toBe(404);
  });

  it('no expone servicios ni profesionales inactivos', async () => {
    const { slug, db } = await seedDemoClinic();
    await db.insert('services', {
      name: 'Servicio inactivo',
      description: null,
      duration_min: 30,
      price_cents: null,
      color: 'sky',
      active: 0,
      created_at: Date.now(),
    } as never);

    const res = await app.request(`/api/public/clinic/${slug}`, undefined, env);
    const body = (await res.json()) as { services: Array<{ name: string }> };

    expect(body.services.map((s) => s.name)).not.toContain('Servicio inactivo');
  });
});

describe('POST /api/secretaria/inquiry', () => {
  it('registra una consulta que no terminó en turno', async () => {
    const { slug, db } = await seedDemoClinic();

    const res = await app.request(
      `/api/secretaria/inquiry?clinic=${slug}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Florencia Ayala', topic: 'Consulta por blanqueamiento' }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const rows = await db.list('ai_inquiries');
    expect(rows).toHaveLength(1);
    expect((rows[0] as { patient_name: string }).patient_name).toBe('Florencia Ayala');
  });

  it('rechaza si falta el nombre', async () => {
    const { slug } = await seedDemoClinic();
    const res = await app.request(
      `/api/secretaria/inquiry?clinic=${slug}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Sin nombre' }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
