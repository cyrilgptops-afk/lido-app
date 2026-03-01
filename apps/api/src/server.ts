import { createApp } from './app';
import { env } from './lib/env';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { db } from './lib/db';
import { cacheConfig, storageConfig } from './config';
import { getStorageClient } from './lib/storage';

const app = createApp();

// ─── Initialize Services ───────────────────────────────────────────────────

async function startServer() {
  // Connect to MySQL
  try {
    await db.connect();
    logger.info('MySQL connected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MySQL');
    process.exit(1);
  }

  // Connect to Redis if using redis adapter
  if (cacheConfig.adapter === 'redis') {
    try {
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis, continuing without cache');
    }
  }

  // Initialize MinIO storage
  try {
    logger.info('Initializing storage adapter...');
    const storage = getStorageClient();
    const result = await storage.initialize();
    
    if (result.success) {
      logger.info({
        adapter: storageConfig.adapter,
        endpoint: `${storageConfig.endpoint}:${storageConfig.port}`,
        buckets: Object.values(storageConfig.buckets),
      }, 'Storage adapter initialized successfully');
    } else {
      logger.warn({ error: result.error }, 'Storage initialization failed - storage operations will not work');
    }
  } catch (error) {
    logger.warn({ error }, 'Storage initialization error - continuing without storage');
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 API server started');
  });

  return server;
}

const serverPromise = startServer();

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing server…');

  const server = await serverPromise;

  // Close MySQL connection
  if (db.isReady()) {
    try {
      await db.disconnect();
      logger.info('MySQL disconnected');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting MySQL');
    }
  }

  // Close Redis connection
  if (cacheConfig.adapter === 'redis' && redis.isReady()) {
    try {
      await redis.disconnect();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting Redis');
    }
  }

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server close');
      process.exit(1);
    }

    logger.info('Server closed gracefully');
    process.exit(0);
  });

  // Force-exit if shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
