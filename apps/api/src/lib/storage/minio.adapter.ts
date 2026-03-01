/**
 * MinIO Storage Adapter
 * Following Lido pattern: Service adapter for MinIO integration
 */

import * as Minio from 'minio';
import { Readable } from 'stream';
import {
  StorageAdapter,
  UploadOptions,
  UploadResult,
  DownloadResult,
  PresignedUrlResult,
  DeleteResult,
  ListResult,
  HealthCheckResult,
} from './adapter';

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
  buckets: {
    bots: string;
    uploads: string;
    assets: string;
    cache: string;
  };
}

export class MinioAdapter implements StorageAdapter {
  private client: Minio.Client;
  private config: MinioConfig;
  private initialized = false;

  constructor(config: MinioConfig) {
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

      const result = await this.client.putObject(bucket, key, stream, size, metaData);

      if (options.tags && Object.keys(options.tags).length > 0) {
        await this.client.setObjectTagging(bucket, key, options.tags);
      }

      return {
        success: true,
        key,
        bucket,
        etag: result.etag,
        versionId: result.versionId || undefined,
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

  async getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds = 3600,
    method: 'GET' | 'PUT' = 'GET'
  ): Promise<PresignedUrlResult> {
    try {
      const url =
        method === 'GET'
          ? await this.client.presignedGetObject(bucket, key, expirySeconds)
          : await this.client.presignedPutObject(bucket, key, expirySeconds);

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

  async delete(bucket: string, key: string): Promise<DeleteResult> {
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

  async list(bucket: string, prefix = '', recursive = false): Promise<ListResult> {
    try {
      const stream = this.client.listObjects(bucket, prefix, recursive);
      const files: Array<{ key: string; size: number; lastModified: Date }> = [];

      for await (const obj of stream) {
        files.push({
          key: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
        });
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

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const buckets = await this.client.listBuckets();
      const bucketNames = buckets.map((b) => b.name);
      const configuredBuckets = Object.values(this.config.buckets);
      const missingBuckets = configuredBuckets.filter((b) => !bucketNames.includes(b));

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
