/**
 * User Model - Independent & Lightweight
 * 
 * Following Lido architecture:
 * - One table = one concern
 * - No roles/org logic in user table
 * - Validate at boundaries (Zod schemas)
 * - JSON for extensibility without schema changes
 */

import { z } from 'zod';

// ==================== Enums ====================
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// ==================== JSON Column Schemas ====================
// Validate at boundaries (Lido principle)
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    digest_frequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional(),
  }).optional(),
}).passthrough().optional();

export const UserMetadataSchema = z.object({
  last_login_ip: z.string().optional(),
  signup_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
}).passthrough().optional();

// ==================== User Interface (Pure Identity) ====================
export interface User {
  id: number;
  uuid: string;
  email: string;
  email_verified_at: Date | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  preferences: z.infer<typeof UserPreferencesSchema>;
  metadata: z.infer<typeof UserMetadataSchema>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  last_seen_at: Date | null;
}

// Database row type (JSON as strings from MySQL)
export interface UserRow {
  id: number;
  uuid: string;
  email: string;
  email_verified_at: Date | string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: string;
  preferences: string | null;
  metadata: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
  last_seen_at: Date | string | null;
}

// ==================== Input Schemas ====================
// Validate at boundaries (Lido principle)
export const CreateUserSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  preferences: UserPreferencesSchema,
  metadata: UserMetadataSchema,
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  status: z.nativeEnum(UserStatus).optional(),
  email_verified_at: z.date().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ==================== Type Guards ====================
export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}
