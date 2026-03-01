/**
 * Storage Configuration
 * Following Lido pattern: Centralized config with adapter pattern
 */

import { z } from 'zod';
import { env } from '../env';

const storageConfigSchema = z.object({
  adapter: z.enum(['minio', 's3', 'local']).default('minio'),
  minio: z.object({
    endpoint: z.string(),
    port: z.number(),
    useSSL: z.boolean(),
    accessKey: z.string(),
    secretKey: z.string(),
    region: z.string(),
    buckets: z.object({
      bots: z.string(),
      uploads: z.string(),
      assets: z.string(),
      cache: z.string(),
    }),
  }),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

function validateStorageConfig(): StorageConfig {
  const useSSL = env.MINIO_USE_SSL === 'true';

  return storageConfigSchema.parse({
    adapter: 'minio', // Default adapter
    minio: {
      endpoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL,
      accessKey: env.MINIO_ROOT_USER,
      secretKey: env.MINIO_ROOT_PASSWORD,
      region: env.MINIO_REGION,
      buckets: {
        bots: env.MINIO_BUCKET_BOTS,
        uploads: env.MINIO_BUCKET_UPLOADS,
        assets: env.MINIO_BUCKET_ASSETS,
        cache: env.MINIO_BUCKET_CACHE,
      },
    },
  });
}

let storageConfig: StorageConfig;

try {
  storageConfig = validateStorageConfig();
} catch (error) {
  console.error('❌ Storage configuration validation failed:', error);
  console.error('   Make sure MINIO_* environment variables are set');
  // Fallback config for development
  storageConfig = {
    adapter: 'minio',
    minio: {
      endpoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'not-configured',
      secretKey: 'not-configured',
      region: 'us-east-1',
      buckets: {
        bots: 'lido-bots',
        uploads: 'lido-uploads',
        assets: 'lido-assets',
        cache: 'lido-cache',
      },
    },
  };
}

export { storageConfig };
