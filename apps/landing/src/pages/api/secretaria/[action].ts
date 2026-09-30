import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
export const POST: APIRoute = async ({ request, params, url }) => {
  if (params.action !== 'chat' && params.action !== 'inquiry') return new Response(null, { status: 404 });
  const slug = url.searchParams.get('clinic');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return new Response(null, { status: 400 });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) headers.set('CF-Connecting-IP', ip);
  try {
    return await env.DENTAL_API.fetch(`https://dental-api/api/secretaria/${params.action}?clinic=${encodeURIComponent(slug)}`, { method: 'POST', headers, body: request.body });
  } catch { return Response.json({ error: 'La asistente no está disponible.' }, { status: 503 }); }
};
