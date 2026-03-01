/**
 * Role Model - Independent RBAC
 * 
 * Roles define permissions.
 * Users get roles per organization via user_organizations.
 */

import { z } from 'zod';

export const RolePermissionsSchema = z.array(z.string()).optional();

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  permissions: RolePermissionsSchema,
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

// Predefined system roles
export enum SystemRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export function isSystemRole(name: string): name is SystemRole {
  return Object.values(SystemRole).includes(name as SystemRole);
}
