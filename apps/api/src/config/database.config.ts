/**
 * Database Configuration
 * 
 * Following Lido architecture:
 * - Validate at boundaries (Zod schemas)
 * - Centralized configuration
 */

import { z } from 'zod';

const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(3306),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  connectionLimit: z.coerce.number().default(10),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export const databaseConfig: DatabaseConfig = DatabaseConfigSchema.parse({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: process.env.MYSQL_POOL_SIZE,
});
