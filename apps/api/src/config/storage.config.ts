/**
 * Storage configuration for API Gateway
 * Following Lido principle: Validate all env vars at startup with zod
 */

import { z } from 'zod';
import { env } from '../lib/env';

const storageConfigSchema = z.object({
  adapter: z.enum(['minio', 's3', 'local']).default('minio'),
  endpoint: z.string().min(1, 'MinIO endpoint is required'),
  port: z.number().int().positive(),
  useSSL: z.boolean(),
  accessKey: z.string().min(1, 'MinIO access key is required'),
  secretKey: z.string().min(1, 'MinIO secret key is required'),
  region: z.string(),
  buckets: z.object({
    bots: z.string(),
    uploads: z.string(),
    assets: z.string(),
    cache: z.string(),
  }),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

function validateStorageConfig(): StorageConfig {
  // Properly parse boolean from string environment variable
  const useSSL = env.MINIO_USE_SSL === 'true';
  
  return storageConfigSchema.parse({
    adapter: 'minio', // Default adapter
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
  });
}

let storageConfig: StorageConfig;

try {
  storageConfig = validateStorageConfig();
} catch (error) {
  console.error('❌ Storage configuration validation failed:', error);
  console.error('   Make sure MINIO_* environment variables are set');
  // Don't exit - allow app to start but storage operations will fail
  // This is useful for development when MinIO is not yet running
  storageConfig = {
    adapter: 'minio',
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
  };
}

export { storageConfig };
