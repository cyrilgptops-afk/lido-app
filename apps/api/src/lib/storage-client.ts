/**
 * Storage Client Wrapper
 * Direct integration of MinIO client in API
 */

import * as Minio from 'minio';
import { StorageConfig } from '../config/storage.config';
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

      if (options.tags && Object.keys(options.tags).length > 0) {
        await this.client.setObjectTagging(bucket, key, options.tags);
      }

      return {
        success: true,
        key,
        bucket,
        etag: result.etag,
        versionId: result.versionId ?? undefined,
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

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const buckets = await this.client.listBuckets();
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
}

let storageClient: StorageClient | null = null;

export function getStorageClient(config: StorageConfig): StorageClient {
  if (!storageClient) {
    storageClient = new StorageClient(config);
  }
  return storageClient;
}
