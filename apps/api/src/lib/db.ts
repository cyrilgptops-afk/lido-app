/**
 * MySQL Database Client
 * 
 * Following Lido architecture:
 * - Structured logging with context
 * - Auto-parse JSON columns
 * - Transaction support
 * - Health checks for monitoring
 */

import mysql from 'mysql2/promise';
import { databaseConfig } from '../config/database.config';

export type MySQLConfig = typeof databaseConfig;

class MySQLClient {
  private pool: mysql.Pool | null = null;
  private config: MySQLConfig;

  constructor() {
    // Use centralized config (Lido best practice)
    this.config = databaseConfig;
  }

  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = mysql.createPool({
      ...this.config,
      timezone: 'Z', // UTC (Lido standard)
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
    });

    console.log('✅ MySQL connection pool created');

    // Test connection
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ MySQL connection verified');
    } catch (error) {
      console.error('❌ MySQL connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute query with auto JSON parsing
   */
  async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized. Call connect() first.');
    }

    const [rows] = await this.pool.execute(sql, values);
    return this.parseJSONColumns(rows as any[]) as T[];
  }

  /**
   * Execute single row query
   */
  async queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, values);
    return rows[0] || null;
  }

  /**
   * Execute query and return raw result
   */
  async queryRaw(sql: string, values?: any[]): Promise<[any, mysql.FieldPacket[]]> {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized');
    }
    return this.pool.execute(sql, values);
  }

  /**
   * Execute transaction (Lido principle: always use transactions for multi-table ops)
   */
  async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Parse JSON columns (MySQL returns JSON as strings)
   */
  private parseJSONColumns(rows: any[]): any[] {
    if (!Array.isArray(rows)) return rows;

    return rows.map((row) => {
      const parsed = { ...row };

      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          if (
            (value.startsWith('{') && value.endsWith('}')) ||
            (value.startsWith('[') && value.endsWith(']'))
          ) {
            try {
              parsed[key] = JSON.parse(value);
            } catch {
              // Not valid JSON, keep as string
            }
          }
        }
      }

      return parsed;
    });
  }

  /**
   * Health check for monitoring (Lido requirement)
   */
  async healthCheck(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const [result] = await this.pool.query('SELECT 1 as health');
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      console.error('MySQL health check failed:', error);
      return false;
    }
  }

  /**
   * Close pool gracefully
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 MySQL connection pool closed');
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) return null;

    // Access private pool properties (not exposed in types)
    const poolInternal = (this.pool as any).pool;

    return {
      total: poolInternal?._allConnections?.length || 0,
      active:
        (poolInternal?._allConnections?.length || 0) -
        (poolInternal?._freeConnections?.length || 0),
      idle: poolInternal?._freeConnections?.length || 0,
    };
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.pool !== null;
  }
}

// Singleton instance (Lido pattern)
export const db = new MySQLClient();

export type { PoolConnection } from 'mysql2/promise';
