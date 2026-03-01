/**
 * Storage Client Factory
 * Following Lido pattern: Adapter pattern with singleton instance
 */

import { StorageAdapter } from './adapter';
import { MinioAdapter } from './minio.adapter';
import { storageConfig } from '../../config';

let storageClient: StorageAdapter | null = null;

/**
 * Get storage client based on configured adapter
 * Following Lido principle: Don't trust external APIs - use adapters
 */
export function getStorageClient(): StorageAdapter {
  if (storageClient) {
    return storageClient;
  }

  // Factory pattern: create adapter based on config
  switch (storageConfig.adapter) {
    case 'minio':
      storageClient = new MinioAdapter({
        endpoint: storageConfig.endpoint,
        port: storageConfig.port,
        useSSL: storageConfig.useSSL,
        accessKey: storageConfig.accessKey,
        secretKey: storageConfig.secretKey,
        region: storageConfig.region,
        buckets: storageConfig.buckets,
      });
      break;
    case 's3':
      // Future: S3Adapter implementation
      throw new Error('S3 adapter not implemented yet');
    case 'local':
      // Future: LocalAdapter implementation
      throw new Error('Local adapter not implemented yet');
    default:
      throw new Error(`Unknown storage adapter: ${storageConfig.adapter}`);
  }

  return storageClient;
}

/**
 * Get storage buckets configuration
 */
export function getStorageBuckets() {
  return storageConfig.buckets;
}

// Re-export types and adapter
export { StorageAdapter, storageConfig };
export type { UploadOptions, UploadResult, DownloadResult } from './adapter';
