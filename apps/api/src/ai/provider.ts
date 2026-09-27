import { createDeepSeek } from '@ai-sdk/deepseek';
import type { Env } from '../env';

export const DEFAULT_MODEL = 'deepseek-flash';

export function deepseekModel(env: Pick<Env, 'DEEPSEEK_API_KEY' | 'DEEPSEEK_MODEL'>) {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('Falta DEEPSEEK_API_KEY. Cargala en apps/api/.dev.vars');
  }
  const provider = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });
  return provider(env.DEEPSEEK_MODEL ?? DEFAULT_MODEL);
}
