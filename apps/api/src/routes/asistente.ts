import { Hono } from 'hono';
import { z } from 'zod';
import { stepCountIs, streamText } from 'ai';
import type { AppBindings } from '../env';
import { getSessionUser } from '../middleware/auth';
import { requireTenant } from '../lib/request-context';
import { buildInternalSystemPrompt } from '../ai/prompt';
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

/**
 * Cara interna del asistente: el copiloto que ve el staff logueado desde el
 * panel de control. Usa el rol real de la membership (owner/admin/dentist/
 * receptionist), no `visitor`, y un prompt que le habla al staff en vez de
 * simular la secretaria de cara al paciente. La cara pública equivalente
 * vive en `routes/secretaria.ts`.
 */
export const asistente = new Hono<AppBindings>();

asistente.get('/appointments', async (c) => {
  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { db } = tenant;
  return c.json({ appointments: await bookingService.list(db) });
});

asistente.post('/chat', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'No autenticado.' }, 401);

  const tenant = await requireTenant(c);
  if (tenant instanceof Response) return tenant;
  const { ctx, db } = tenant;

  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Mensajes inválidos.' }, 400);
  }

  try {
    const result = streamText({
      model: deepseekModel(c.env),
      system: await buildInternalSystemPrompt(db, user.name),
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
