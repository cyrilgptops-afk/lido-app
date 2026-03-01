/**
 * MinIO Storage Configuration
 * Following Lido principle: Validate at boundaries using zod
 */

import { z } from 'zod';

const storageConfigSchema = z.object({
  endpoint: z.string().min(1, 'MinIO endpoint is required'),
  port: z.coerce.number().int().positive().default(9000),
  useSSL: z.coerce.boolean().default(false),
  accessKey: z.string().min(1, 'MinIO access key is required'),
  secretKey: z.string().min(1, 'MinIO secret key is required'),
  region: z.string().default('us-east-1'),
  buckets: z.object({
    bots: z.string().default('lido-bots'),
    uploads: z.string().default('lido-uploads'),
    assets: z.string().default('lido-assets'),
    cache: z.string().default('lido-cache'),
  }),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

/**
 * Validate and parse MinIO configuration from environment variables
 * @throws {z.ZodError} If validation fails
 */
export function validateStorageConfig(): StorageConfig {
  return storageConfigSchema.parse({
    endpoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
    region: process.env.MINIO_REGION,
    buckets: {
      bots: process.env.MINIO_BUCKET_BOTS,
      uploads: process.env.MINIO_BUCKET_UPLOADS,
      assets: process.env.MINIO_BUCKET_ASSETS,
      cache: process.env.MINIO_BUCKET_CACHE,
    },
  });
}
