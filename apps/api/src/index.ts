import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { NotFoundError } from '@dental/core';
import type { AppBindings } from './env';
import { secretaria } from './routes/secretaria';
import { asistente } from './routes/asistente';
import { auth } from './routes/auth';
import { clinic } from './routes/clinic';
import { publicRoutes } from './routes/public';
import { doctors } from './routes/doctors';
import { services } from './routes/services';
import { patients } from './routes/patients';
import { appointments } from './routes/appointments';
import { clinical } from './routes/clinical';
import { platform } from './routes/platform';

const app = new Hono<AppBindings>();

function isAllowedOrigin(requestUrl: string, origin: string | undefined, allowedOrigin?: string) {
  if (!origin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  if (origin === new URL(requestUrl).origin) return true;
  return Boolean(allowedOrigin && origin === allowedOrigin);
}

app.use('/api/*', (c, next) =>
  cors({
    origin: (origin) => {
      return isAllowedOrigin(c.req.url, origin, c.env?.ALLOWED_ORIGIN) ? origin : undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  })(c, next),
);

app.use('/api/*', bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'La solicitud es demasiado grande.' }, 413) }));
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  await next();
});

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'POST') {
    const path = c.req.path;
    const limiter = path === '/api/auth/signup' || path === '/api/auth/login' ? c.env.AUTH_LIMIT
      : path.startsWith('/api/secretaria/') || path.startsWith('/api/asistente/') ? c.env.AI_LIMIT : null;
    if (limiter && !(await limiter.limit({ key: c.req.header('CF-Connecting-IP') ?? 'local' })).success) {
      c.header('Retry-After', '60');
      return c.json({ error: 'Demasiados intentos. Esperá un minuto y volvé a intentar.' }, 429);
    }
  }
  await next();
});

app.use('/api/*', async (c, next) => {
  const needsOriginCheck = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method) &&
    !c.req.path.startsWith('/api/auth/') &&
    !c.req.path.startsWith('/api/secretaria/');
  if (needsOriginCheck && !isAllowedOrigin(c.req.url, c.req.header('Origin'), c.env.ALLOWED_ORIGIN)) {
    return c.json({ error: 'Origen no permitido.' }, 403);
  }
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/auth', auth);
app.route('/api/platform', platform);
app.route('/api/public', publicRoutes);
app.route('/api/clinic', clinic);
app.route('/api/doctors', doctors);
app.route('/api/services', services);
app.route('/api/patients', patients);
app.route('/api/appointments', appointments);
app.route('/api/secretaria', secretaria);
app.route('/api/asistente', asistente);
app.route('/api', clinical);

app.onError((error, c) => {
  if (error instanceof NotFoundError) return c.json({ error: 'No encontrado.' }, 404);
  console.error(error);
  return c.json({ error: 'Error interno.' }, 500);
});

app.notFound((c) => c.req.path.startsWith('/api/')
  ? c.json({ error: 'Ruta inexistente.' }, 404)
  : c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text('Panel disponible en el servidor de desarrollo.', 404));
export default app;
