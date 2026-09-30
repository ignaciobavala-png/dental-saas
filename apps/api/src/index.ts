import { Hono } from 'hono';
import { cors } from 'hono/cors';
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

const app = new Hono<AppBindings>();

app.use('/api/*', (c, next) =>
  cors({
    origin: (origin) => {
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
      const allowed = c.env?.ALLOWED_ORIGIN;
      return allowed && origin === allowed ? origin : undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  })(c, next),
);

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/auth', auth);
app.route('/api/public', publicRoutes);
app.route('/api/clinic', clinic);
app.route('/api/doctors', doctors);
app.route('/api/services', services);
app.route('/api/patients', patients);
app.route('/api/appointments', appointments);
app.route('/api/secretaria', secretaria);
app.route('/api/asistente', asistente);
app.route('/api', clinical);

export default app;
