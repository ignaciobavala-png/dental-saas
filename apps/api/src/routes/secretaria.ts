import { Hono } from 'hono';
import { z } from 'zod';
import { stepCountIs, streamText } from 'ai';
import type { Env } from '../env';
import { publicVisitorContext } from '../ai/context';
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

export const secretaria = new Hono<{ Bindings: Env }>();

secretaria.get('/appointments', (c) => c.json({ appointments: bookingService.list() }));

secretaria.post('/chat', async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Mensajes inválidos.' }, 400);
  }

  try {
    const result = streamText({
      model: deepseekModel(c.env),
      system: buildPublicSystemPrompt(),
      messages: parsed.data.messages,
      tools: buildPublicTools(publicVisitorContext),
      stopWhen: stepCountIs(5),
      providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});
