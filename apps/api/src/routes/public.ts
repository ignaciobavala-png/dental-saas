import { Hono } from 'hono';
import { clinicsRepo, createTenantContext, TenantDb } from '@dental/core';
import type { AppBindings } from '../env';
import { catalogService, getClinicSettings } from '../domain/services';

export const publicRoutes = new Hono<AppBindings>();

/**
 * Cara pública de un consultorio para su landing (`apps/landing`). Sin sesión:
 * se resuelve por slug y devuelve solo la proyección apta para un visitante
 * anónimo (contenido de la clínica + tratamientos y profesionales activos).
 *
 * El slug llega por path (`/api/public/clinic/:slug`) porque la landing todavía
 * lo fija con `PUBLIC_CLINIC_SLUG`; cuando exista la resolución por hostname
 * (H4) va a llamar a este mismo endpoint ya sabiendo el slug.
 */
publicRoutes.get('/clinic/:slug', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await clinicsRepo(c.env.DB).bySlug(slug);
  if (!clinic || clinic.status === 'suspended') {
    return c.json({ error: 'Consultorio no encontrado.' }, 404);
  }

  const ctx = createTenantContext({ clinicId: clinic.id, userId: null, role: 'visitor' });
  const db = new TenantDb(ctx, c.env.DB);

  const { content } = await getClinicSettings(db);
  const [services, doctors] = await Promise.all([
    catalogService.services(db),
    catalogService.doctors(db),
  ]);

  return c.json({
    slug: clinic.slug,
    name: content.name || clinic.name,
    tagline: content.tagline ?? null,
    phone: content.phone ?? null,
    whatsapp: content.whatsapp ?? null,
    email: content.email ?? null,
    address: content.address ?? null,
    openingHours: content.openingHours ?? [],
    slotMinutes: content.slotMinutes ?? null,
    obrasSociales: content.obrasSociales ?? [],
    faqs: content.faqs ?? [],
    testimonials: content.testimonials ?? [],
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.duration_min,
      priceCents: s.price_cents,
      color: s.color,
    })),
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      bio: d.bio,
      photoUrl: d.photo_url,
      serviceIds: d.serviceIds,
    })),
  });
});
