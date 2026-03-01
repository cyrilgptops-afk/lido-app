/**
 * Cache Configuration
 * 
 * Centralized cache settings for Redis and in-memory adapters
 */

import { z } from 'zod';

const CacheConfigSchema = z.object({
  adapter: z.enum(['redis', 'memory']).default('memory'),
  ttl: z.number().positive().default(300), // 5 minutes
  prefix: z.string().default('lido'),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
  }),
  memory: z.object({
    maxSize: z.number().positive().default(500),
  }),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

export const cacheConfig: CacheConfig = CacheConfigSchema.parse({
  adapter: process.env.CACHE_ADAPTER || 'memory',
  ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300,
  prefix: process.env.CACHE_PREFIX || 'lido',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
  },
  memory: {
    maxSize: process.env.CACHE_MEMORY_MAX_SIZE ? parseInt(process.env.CACHE_MEMORY_MAX_SIZE) : 500,
  },
});
