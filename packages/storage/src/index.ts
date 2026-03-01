/**
 * @lido/storage - MinIO Storage Package
 * Provides file storage capabilities for Lido SaaS platform
 */

export { StorageClient, getStorageClient } from './client';
export { validateStorageConfig } from './config';
export type {
  UploadOptions,
  UploadResult,
  DownloadResult,
  HealthCheckResult,
} from './client';
