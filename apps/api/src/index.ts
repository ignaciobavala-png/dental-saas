import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { secretaria } from './routes/secretaria';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', (c, next) =>
  cors({
    origin: (origin) => {
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
      const allowed = c.env?.ALLOWED_ORIGIN;
      return allowed && origin === allowed ? origin : undefined;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next),
);

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/secretaria', secretaria);

export default app;
