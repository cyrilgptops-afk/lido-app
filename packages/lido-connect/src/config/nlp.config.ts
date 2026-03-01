import { z } from 'zod';

/**
 * Zod schema for NLP configuration
 */
export const NLPConfigSchema = z.object({
  adapter: z.enum(['rasa']).default('rasa'),
  rasaUrl: z.string().url(),
  rasaToken: z.string().optional(),
  timeout: z.number().positive().default(10000),
  retryAttempts: z.number().int().min(0).max(5).default(3),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  enableCache: z.boolean().default(true),
  cacheTTL: z.number().positive().default(3600),
});

export type NLPConfig = z.infer<typeof NLPConfigSchema>;

/**
 * Create NLP configuration from environment variables
 */
export function createNLPConfig(env: Record<string, string | undefined>): NLPConfig {
  return NLPConfigSchema.parse({
    adapter: env.LIDO_CONNECT_NLP_ADAPTER || 'rasa',
    rasaUrl: env.LIDO_CONNECT_RASA_URL || 'http://localhost:5005',
    rasaToken: env.LIDO_CONNECT_RASA_TOKEN,
    timeout: env.LIDO_CONNECT_NLP_TIMEOUT ? parseInt(env.LIDO_CONNECT_NLP_TIMEOUT, 10) : 10000,
    retryAttempts: env.LIDO_CONNECT_NLP_RETRY_ATTEMPTS ? parseInt(env.LIDO_CONNECT_NLP_RETRY_ATTEMPTS, 10) : 3,
    confidenceThreshold: env.LIDO_CONNECT_NLP_CONFIDENCE_THRESHOLD ? parseFloat(env.LIDO_CONNECT_NLP_CONFIDENCE_THRESHOLD) : 0.7,
    enableCache: env.LIDO_CONNECT_NLP_ENABLE_CACHE !== 'false',
    cacheTTL: env.LIDO_CONNECT_NLP_CACHE_TTL ? parseInt(env.LIDO_CONNECT_NLP_CACHE_TTL, 10) : 3600,
  });
}
