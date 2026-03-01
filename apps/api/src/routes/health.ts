/**
 * Health check endpoint with MinIO monitoring
 * Following Lido principle: Track key metrics for observability
 */

import express from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';
import { getStorageClient } from '../lib/storage';

const router = express.Router();

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    mysql: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
    redis: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
    minio: {
      connected: boolean;
      buckets?: string[];
      responseTime?: number;
      error?: string;
    };
  };
  version: string;
}

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns API health status including MySQL, Redis, and MinIO storage connectivity with response times
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [ok, degraded, error]
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-01T12:00:00.000Z"
 *                     uptime:
 *                       type: number
 *                       example: 123.456
 *                     services:
 *                       type: object
 *                       properties:
 *                         mysql:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                             responseTime:
 *                               type: number
 *                             error:
 *                               type: string
 *                         redis:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                             responseTime:
 *                               type: number
 *                             error:
 *                               type: string
 *                         minio:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                             buckets:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             responseTime:
 *                               type: number
 *                             error:
 *                               type: string
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *       503:
 *         description: One or more services are degraded or unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const health: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mysql: { connected: false },
      redis: { connected: false },
      minio: { connected: false },
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check MySQL
  const mysqlStart = Date.now();
  try {
    await db.queryOne('SELECT 1 as health');
    health.services.mysql.connected = true;
    health.services.mysql.responseTime = Date.now() - mysqlStart;
  } catch (err: any) {
    health.services.mysql.error = err.message;
    health.services.mysql.responseTime = Date.now() - mysqlStart;
    health.status = 'degraded';
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    const isHealthy = await redis.healthCheck();
    health.services.redis.connected = isHealthy;
    health.services.redis.responseTime = Date.now() - redisStart;
    if (!isHealthy) {
      health.services.redis.error = 'Redis health check failed';
      health.status = 'degraded';
    }
  } catch (err: any) {
    health.services.redis.error = err.message;
    health.services.redis.responseTime = Date.now() - redisStart;
    health.status = 'degraded';
  }

  // Check MinIO
  const minioStart = Date.now();
  try {
    const storage = getStorageClient();
    const minioHealth = await storage.healthCheck();
    
    health.services.minio.connected = minioHealth.healthy;
    health.services.minio.responseTime = Date.now() - minioStart;
    
    if (minioHealth.healthy) {
      health.services.minio.buckets = minioHealth.buckets;
    } else {
      health.services.minio.error = minioHealth.error?.message;
      health.status = 'degraded';
    }
  } catch (err: any) {
    health.services.minio.error = err.message;
    health.services.minio.responseTime = Date.now() - minioStart;
    health.status = 'degraded';
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 503;
  
  res.status(statusCode).json({
    success: health.status === 'ok',
    data: health,
  });
});

export default router;
