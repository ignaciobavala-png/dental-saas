import { Hono } from 'hono';
import { z } from 'zod';
import { stepCountIs, streamText } from 'ai';
import { clinicsRepo, createTenantContext, TenantDb, type TenantContext } from '@dental/core';
import type { AppBindings } from '../env';
import { getSessionUser } from '../middleware/auth';
import { resolveTenantContext } from '../middleware/tenant';
import { buildPublicSystemPrompt } from '../ai/prompt';
import { deepseekModel } from '../ai/provider';
import { buildPublicTools } from '../ai/tools';
import { bookingService } from '../domain/services';

const bodySchema = z.object({
  messages: z
    .array(
      z.strictObject({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export const secretaria = new Hono<AppBindings>();

/**
 * El agente público (secretaría) se identifica siempre como `visitor`, sin
 * importar si quien llama es un visitante anónimo de la landing o el propio
 * consultorio previsualizando el bot desde el panel. Lo único que cambia es
 * qué clínica se resuelve:
 * - Sesión válida (panel) → la clínica activa del usuario logueado.
 * - Sin sesión (landing pública) → `?clinic=<slug>`, como si viniera resuelto
 *   por hostname (esa resolución vive en `apps/landing`, fuera de esta tanda).
 */
async function resolvePublicContext(c: import('hono').Context<AppBindings>): Promise<TenantContext | null> {
  const user = await getSessionUser(c);
  if (user) {
    const ctx = await resolveTenantContext(c, user);
    if (ctx) return createTenantContext({ clinicId: ctx.clinicId, userId: ctx.userId, role: 'visitor' });
  }

  const slug = c.req.query('clinic');
  if (!slug) return null;
  const clinic = await clinicsRepo(c.env.DB).bySlug(slug);
  if (!clinic) return null;
  return createTenantContext({ clinicId: clinic.id, userId: null, role: 'visitor' });
}

secretaria.get('/appointments', async (c) => {
  const ctx = await resolvePublicContext(c);
  if (!ctx) return c.json({ appointments: [] });
  const db = new TenantDb(ctx, c.env.DB);
  return c.json({ appointments: await bookingService.list(db) });
});

secretaria.post('/chat', async (c) => {
  const ctx = await resolvePublicContext(c);
  if (!ctx) return c.json({ error: 'No se pudo identificar la clínica.' }, 400);

  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Mensajes inválidos.' }, 400);
  }

  const db = new TenantDb(ctx, c.env.DB);

  try {
    const result = streamText({
      model: deepseekModel(c.env),
      system: await buildPublicSystemPrompt(db),
      messages: parsed.data.messages,
      tools: buildPublicTools(ctx, db),
      stopWhen: stepCountIs(5),
      providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});
