/**
 * Storage Adapter Interface
 * Following Lido pattern: Create a service adapter per integration
 */

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

export interface PresignedUrlResult {
  success: boolean;
  url?: string;
  error?: { code: string; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { code: string; message: string };
}

export interface ListResult {
  success: boolean;
  files?: Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>;
  error?: { code: string; message: string };
}

export interface HealthCheckResult {
  healthy: boolean;
  buckets?: string[];
  error?: { code: string; message: string };
}

/**
 * Storage Adapter Interface
 * All storage implementations must conform to this interface
 */
export interface StorageAdapter {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<{ success: boolean; error?: { code: string; message: string } }>;

  /**
   * Upload a file
   */
  upload(
    bucket: string,
    key: string,
    data: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Download a file
   */
  download(bucket: string, key: string): Promise<DownloadResult>;

  /**
   * Get presigned URL for direct access
   */
  getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds?: number,
    method?: 'GET' | 'PUT'
  ): Promise<PresignedUrlResult>;

  /**
   * Delete a file
   */
  delete(bucket: string, key: string): Promise<DeleteResult>;

  /**
   * List files in a bucket
   */
  list(bucket: string, prefix?: string, recursive?: boolean): Promise<ListResult>;

  /**
   * Check if file exists
   */
  exists(bucket: string, key: string): Promise<boolean>;

  /**
   * Health check
   */
  healthCheck(): Promise<HealthCheckResult>;
}
