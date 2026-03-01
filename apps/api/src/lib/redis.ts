/**
 * Redis Client Utility
 * 
 * Singleton Redis client with connection lifecycle management,
 * error handling, and common operations.
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';
import { cacheConfig } from '../config';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize and connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Redis client already connected');
      return;
    }

    if (this.isConnecting) {
      logger.info('Redis connection in progress');
      return;
    }

    this.isConnecting = true;

    try {
      this.client = createClient({
        socket: {
          host: cacheConfig.redis.host,
          port: cacheConfig.redis.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
        },
        password: cacheConfig.redis.password,
        database: cacheConfig.redis.db,
      });

      this.client.on('error', (err) => {
        logger.error({ err }, 'Redis client error');
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      logger.error({ error }, 'Failed to connect to Redis');
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis client disconnected gracefully');
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isReady()) return false;
      const pong = await this.client!.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Redis health check failed');
      return false;
    }
  }

  // ==================== Common Operations ====================

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  /**
   * Get and parse JSON value
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, 'Failed to parse JSON from Redis');
      return null;
    }
  }

  /**
   * Set value with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  /**
   * Set JSON value with optional TTL
   */
  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttl);
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.del(keys);
  }

  /**
   * Check if key exists
   */
  async exists(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.exists(keys);
  }

  /**
   * Set expiration on key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  /**
   * Get TTL of key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Increment value by 1
   */
  async incr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * Increment value by amount
   */
  async incrBy(key: string, increment: number): Promise<number> {
    const client = this.getClient();
    return await client.incrBy(key, increment);
  }

  /**
   * Decrement value by 1
   */
  async decr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.decr(key);
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  /**
   * Delete all keys matching pattern (use with caution)
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.del(...keys);
  }

  /**
   * Flush all data in current database (use with extreme caution)
   */
  async flushDb(): Promise<void> {
    const client = this.getClient();
    await client.flushDb();
    logger.warn('Redis database flushed');
  }

  // ==================== Hash Operations ====================

  /**
   * Set hash field
   */
  async hSet(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hSet(key, field, value);
  }

  /**
   * Get hash field
   */
  async hGet(key: string, field: string): Promise<string | undefined> {
    const client = this.getClient();
    return await client.hGet(key, field);
  }

  /**
   * Get all hash fields
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hGetAll(key);
  }

  /**
   * Delete hash field
   */
  async hDel(key: string, ...fields: string[]): Promise<number> {
    const client = this.getClient();
    return await client.hDel(key, fields);
  }

  // ==================== List Operations ====================

  /**
   * Push to end of list
   */
  async rPush(key: string, ...values: string[]): Promise<number> {
    const client = this.getClient();
    return await client.rPush(key, values);
  }

  /**
   * Push to start of list
   */
  async lPush(key: string, ...values: string[]): Promise<number> {
    const client = this.getClient();
    return await client.lPush(key, values);
  }

  /**
   * Pop from end of list
   */
  async rPop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rPop(key);
  }

  /**
   * Pop from start of list
   */
  async lPop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lPop(key);
  }

  /**
   * Get list range
   */
  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lRange(key, start, stop);
  }

  // ==================== Set Operations ====================

  /**
   * Add to set
   */
  async sAdd(key: string, ...members: string[]): Promise<number> {
    const client = this.getClient();
    return await client.sAdd(key, members);
  }

  /**
   * Remove from set
   */
  async sRem(key: string, ...members: string[]): Promise<number> {
    const client = this.getClient();
    return await client.sRem(key, members);
  }

  /**
   * Get all set members
   */
  async sMembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.sMembers(key);
  }

  /**
   * Check if member exists in set
   */
  async sIsMember(key: string, member: string): Promise<boolean> {
    const client = this.getClient();
    return await client.sIsMember(key, member);
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

// Export utility functions
export const redis = {
  connect: () => redisClient.connect(),
  disconnect: () => redisClient.disconnect(),
  isReady: () => redisClient.isReady(),
  healthCheck: () => redisClient.healthCheck(),
  getClient: () => redisClient.getClient(),

  // Common operations
  get: (key: string) => redisClient.get(key),
  getJSON: <T>(key: string) => redisClient.getJSON<T>(key),
  set: (key: string, value: string, ttl?: number) => redisClient.set(key, value, ttl),
  setJSON: <T>(key: string, value: T, ttl?: number) => redisClient.setJSON(key, value, ttl),
  del: (...keys: string[]) => redisClient.del(...keys),
  exists: (...keys: string[]) => redisClient.exists(...keys),
  expire: (key: string, seconds: number) => redisClient.expire(key, seconds),
  ttl: (key: string) => redisClient.ttl(key),
  incr: (key: string) => redisClient.incr(key),
  incrBy: (key: string, increment: number) => redisClient.incrBy(key, increment),
  decr: (key: string) => redisClient.decr(key),
  keys: (pattern: string) => redisClient.keys(pattern),
  deletePattern: (pattern: string) => redisClient.deletePattern(pattern),

  // Hash operations
  hSet: (key: string, field: string, value: string) => redisClient.hSet(key, field, value),
  hGet: (key: string, field: string) => redisClient.hGet(key, field),
  hGetAll: (key: string) => redisClient.hGetAll(key),
  hDel: (key: string, ...fields: string[]) => redisClient.hDel(key, ...fields),

  // List operations
  rPush: (key: string, ...values: string[]) => redisClient.rPush(key, ...values),
  lPush: (key: string, ...values: string[]) => redisClient.lPush(key, ...values),
  rPop: (key: string) => redisClient.rPop(key),
  lPop: (key: string) => redisClient.lPop(key),
  lRange: (key: string, start: number, stop: number) => redisClient.lRange(key, start, stop),

  // Set operations
  sAdd: (key: string, ...members: string[]) => redisClient.sAdd(key, ...members),
  sRem: (key: string, ...members: string[]) => redisClient.sRem(key, ...members),
  sMembers: (key: string) => redisClient.sMembers(key),
  sIsMember: (key: string, member: string) => redisClient.sIsMember(key, member),
};
