import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { toClinicData } from './lib/clinic';
import type { PublicClinic } from '@dental/contracts';
export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith('/c/')) return next();
  const slug = context.params.slug;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return new Response('Consultorio no encontrado.', { status: 404 });
  try {
    const response = await env.DENTAL_API.fetch(`https://dental-api/api/public/clinic/${slug}`);
    if (!response.ok) return new Response(response.status === 404 ? 'Este consultorio no está disponible.' : 'No pudimos cargar el consultorio. Intentá nuevamente.', { status: response.status === 404 ? 404 : 503 });
    context.locals.clinic = toClinicData(await response.json() as PublicClinic);
    const page = await next();
    page.headers.set('Cache-Control', 'no-store');
    return page;
  } catch {
    return new Response('No pudimos cargar el consultorio. Intentá nuevamente en unos minutos.', { status: 503 });
  }
});
