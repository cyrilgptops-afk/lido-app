/**
 * Storage Routes
 * File upload/download/delete with MinIO integration
 */

import express from 'express';
import multer from 'multer';
import { getStorageClient, getStorageBuckets } from '../lib/storage';
import { logger } from '../lib/logger';

const router = express.Router();
const storage = getStorageClient();
const buckets = getStorageBuckets();

// ---------------------------------------------------------------------------
// In-memory presigned URL cache
// Key: `${bucket}:${key}` → { url, expiresAt (epoch ms) }
// TTL is 1 hour — well within the 7-day presigned URL validity window.
// ---------------------------------------------------------------------------
interface UrlCacheEntry { url: string; expiresAt: number; }
const urlCache = new Map<string, UrlCacheEntry>();
const URL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedUrl(bucket: string, key: string): string | null {
  const entry = urlCache.get(`${bucket}:${key}`);
  if (entry && entry.expiresAt > Date.now()) return entry.url;
  urlCache.delete(`${bucket}:${key}`);
  return null;
}

function setCachedUrl(bucket: string, key: string, url: string): void {
  urlCache.set(`${bucket}:${key}`, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
}

function bustCachedUrl(bucket: string, key: string): void {
  urlCache.delete(`${bucket}:${key}`);
}

// Configure multer for memory storage - all file types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * Generic file upload endpoint
 * POST /admin/storage/upload
 * Body: { file, bucket?, path?, metadata?, tags? }
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file provided' },
      });
    }

    const { bucket, path, metadata, tags } = req.body;

    // Use uploads bucket by default
    const targetBucket = bucket || buckets.uploads;

    // Generate unique file key with optional path prefix
    const ext = req.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const fileName = req.file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    const key = path 
      ? `${path}/${sanitizedFileName}-${timestamp}.${ext}`
      : `${sanitizedFileName}-${timestamp}.${ext}`;

    // Parse metadata and tags if provided as JSON strings
    const parsedMetadata = metadata ? JSON.parse(metadata) : {};
    const parsedTags = tags ? JSON.parse(tags) : {};

    // Upload to MinIO
    const uploadResult = await storage.upload(
      targetBucket,
      key,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        metadata: {
          'original-name': req.file.originalname,
          'uploaded-at': new Date().toISOString(),
          ...parsedMetadata,
        },
        tags: parsedTags,
      }
    );

    if (!uploadResult.success) {
      logger.error({ error: uploadResult.error }, 'Failed to upload file to MinIO');
      return res.status(500).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: 'Failed to upload file' },
      });
    }

    // Generate presigned URL for viewing
    const urlResult = await storage.getPresignedUrl(
      targetBucket,
      key,
      7 * 24 * 60 * 60, // 7 days
      'GET'
    );

    logger.info({ bucket: targetBucket, key }, 'File uploaded successfully');

    res.json({
      success: true,
      data: {
        key,
        bucket: targetBucket,
        url: urlResult.success ? urlResult.url : null,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error uploading file');
    next(error);
  }
});

/**
 * Get presigned URL for any file
 * POST /admin/storage/url
 * Body: { bucket, key, expirySeconds? }
 */
router.post('/url', async (req, res, next) => {
  try {
    const { bucket, key, expirySeconds } = req.body;

    if (!bucket || !key) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Bucket and key are required' },
      });
    }

    // Return cached presigned URL if still fresh
    const cached = getCachedUrl(bucket, key);
    if (cached) {
      res.set('Cache-Control', 'private, max-age=3600');
      return res.json({ success: true, data: { url: cached, bucket, key, cached: true } });
    }

    // Check if file exists
    const exists = await storage.exists(bucket, key);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }

    // Generate presigned URL
    const expiry = expirySeconds || 7 * 24 * 60 * 60; // Default 7 days
    const result = await storage.getPresignedUrl(bucket, key, expiry, 'GET');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'URL_GENERATION_FAILED', message: 'Failed to generate URL' },
      });
    }

    setCachedUrl(bucket, key, result.url!);
    res.set('Cache-Control', 'private, max-age=3600');
    res.json({
      success: true,
      data: {
        url: result.url,
        bucket,
        key,
        cached: false,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Delete any file
 * DELETE /admin/storage/delete
 * Body: { bucket, key }
 */
router.delete('/delete', async (req, res, next) => {
  try {
    const { bucket, key } = req.body;

    if (!bucket || !key) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Bucket and key are required' },
      });
    }

    // Delete from MinIO
    const deleteResult = await storage.delete(bucket, key);

    if (!deleteResult.success) {
      logger.error({ error: deleteResult.error, bucket, key }, 'Failed to delete file from MinIO');
      return res.status(500).json({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete file' },
      });
    }

    bustCachedUrl(bucket, key);
    logger.info({ bucket, key }, 'File deleted successfully');

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * List files in a bucket
 * GET /admin/storage/list
 * Query: { bucket, prefix?, recursive? }
 */
router.get('/list', async (req, res, next) => {
  try {
    const { bucket, prefix, recursive } = req.query;

    if (!bucket) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_BUCKET', message: 'Bucket is required' },
      });
    }

    const result = await storage.list(
      bucket as string,
      prefix as string || '',
      recursive === 'true'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_FAILED', message: 'Failed to list files' },
      });
    }

    res.json({
      success: true,
      data: {
        bucket,
        files: result.files,
        count: result.files?.length || 0,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;