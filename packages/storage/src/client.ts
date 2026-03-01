/**
 * MinIO Storage Client
 * Following Lido patterns: Result<T, E> instead of throwing, structured logging
 */

import * as Minio from 'minio';
import { StorageConfig } from './config';
import { Readable } from 'stream';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  bucket?: string;
  etag?: string;
  versionId?: string;
  error?: { code: string; message: string };
}

export interface DownloadResult {
  success: boolean;
  stream?: Readable;
  metadata?: Record<string, string>;
  error?: { code: string; message: string };
}

export interface HealthCheckResult {
  healthy: boolean;
  buckets?: string[];
  error?: { code: string; message: string };
}

export class StorageClient {
  private client: Minio.Client;
  private config: StorageConfig;
  private initialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
    this.client = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
    });
  }

  /**
   * Initialize storage: create buckets if they don't exist
   * Following Lido principle: Validate at boundaries
   */
  async initialize(): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      const buckets = Object.values(this.config.buckets);
      
      for (const bucket of buckets) {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, this.config.region);
          
          // Set lifecycle policies for cache bucket (auto-delete after 7 days)
          if (bucket === this.config.buckets.cache) {
            await this.setCacheLifecyclePolicy(bucket);
          }
        }
      }

      this.initialized = true;
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'INIT_ERROR',
          message: error.message || 'Failed to initialize MinIO storage',
        },
      };
    }
  }

  /**
   * Upload file to MinIO
   * Following Lido pattern: Return Result<T, E> instead of throwing
   */
  async upload(
    bucket: string,
    key: string,
    data: Buffer | Readable | string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const metaData: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        ...options.metadata,
      };

      let stream: Readable;
      let size: number | undefined;

      if (Buffer.isBuffer(data)) {
        stream = Readable.from(data);
        size = data.length;
      } else if (typeof data === 'string') {
        const buffer = Buffer.from(data, 'utf-8');
        stream = Readable.from(buffer);
        size = buffer.length;
      } else {
        stream = data;
      }

      const result = await this.client.putObject(
        bucket,
        key,
        stream,
        size,
        metaData
      );

      // Apply tags if provided
      if (options.tags && Object.keys(options.tags).length > 0) {
        await this.client.setObjectTagging(bucket, key, options.tags);
      }

      return {
        success: true,
        key,
        bucket,
        etag: result.etag,
        versionId: result.versionId || '1',
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'UPLOAD_ERROR',
          message: error.message || 'Failed to upload file',
        },
      };
    }
  }

  /**
   * Download file from MinIO
   */
  async download(bucket: string, key: string): Promise<DownloadResult> {
    try {
      const stream = await this.client.getObject(bucket, key);
      const stat = await this.client.statObject(bucket, key);

      return {
        success: true,
        stream,
        metadata: stat.metaData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'DOWNLOAD_ERROR',
          message: error.message || 'Failed to download file',
        },
      };
    }
  }

  /**
   * Get pre-signed URL for direct upload/download
   * Useful for frontend direct uploads
   */
  async getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds = 3600,
    method: 'GET' | 'PUT' = 'GET'
  ): Promise<{ success: boolean; url?: string; error?: { code: string; message: string } }> {
    try {
      const url = await (method === 'GET'
        ? this.client.presignedGetObject(bucket, key, expirySeconds)
        : this.client.presignedPutObject(bucket, key, expirySeconds));

      return { success: true, url };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'PRESIGNED_URL_ERROR',
          message: error.message || 'Failed to generate presigned URL',
        },
      };
    }
  }

  /**
   * Delete file from MinIO
   */
  async delete(bucket: string, key: string): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      await this.client.removeObject(bucket, key);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'DELETE_ERROR',
          message: error.message || 'Failed to delete file',
        },
      };
    }
  }

  /**
   * List files in a bucket with prefix
   */
  async list(
    bucket: string,
    prefix = '',
    recursive = false
  ): Promise<{ success: boolean; files?: Minio.BucketItem[]; error?: { code: string; message: string } }> {
    try {
      const stream = this.client.listObjects(bucket, prefix, recursive);
      const files: Minio.BucketItem[] = [];

      for await (const obj of stream) {
        files.push(obj);
      }

      return { success: true, files };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'LIST_ERROR',
          message: error.message || 'Failed to list files',
        },
      };
    }
  }

  /**
   * Check if file exists
   */
  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Health check for monitoring
   * Following Lido principle: Track key metrics for observability
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Test connection by listing buckets
      const buckets = await this.client.listBuckets();
      
      // Verify all configured buckets exist
      const bucketNames = buckets.map((b) => b.name);
      const configuredBuckets = Object.values(this.config.buckets);
      const missingBuckets = configuredBuckets.filter(b => !bucketNames.includes(b));
      
      if (missingBuckets.length > 0) {
        return {
          healthy: false,
          error: {
            code: 'MISSING_BUCKETS',
            message: `Missing buckets: ${missingBuckets.join(', ')}`,
          },
        };
      }

      return {
        healthy: true,
        buckets: bucketNames,
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: {
          code: error.code || 'CONNECTION_ERROR',
          message: error.message || 'Failed to connect to MinIO',
        },
      };
    }
  }

  /**
   * Set lifecycle policy for cache bucket
   * Auto-delete files older than 7 days
   */
  private async setCacheLifecyclePolicy(bucket: string): Promise<void> {
    try {
      const lifecycleConfig = {
        Rule: [
          {
            ID: 'expire-cache-files',
            Status: 'Enabled',
            Expiration: { Days: 7 },
          },
        ],
      };

      await this.client.setBucketLifecycle(bucket, lifecycleConfig);
    } catch (error) {
      // Log but don't fail initialization if lifecycle policy fails
      console.warn(`Failed to set lifecycle policy for ${bucket}:`, error);
    }
  }
}

// Singleton instance
let storageClient: StorageClient | null = null;

export function getStorageClient(config: StorageConfig): StorageClient {
  if (!storageClient) {
    storageClient = new StorageClient(config);
  }
  return storageClient;
}
