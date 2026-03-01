/**
 * User-Organization Membership Model
 * 
 * Join table connecting users to organizations with roles.
 * Many-to-many relationship with role assignment.
 */

import { z } from 'zod';

export interface UserOrganization {
  id: number;
  user_id: number;
  org_id: number;
  role_id: number;
  invited_by: number | null;
  joined_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const AddUserToOrgSchema = z.object({
  user_id: z.number().int().positive(),
  org_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  invited_by: z.number().int().positive().optional(),
});

export type AddUserToOrgInput = z.infer<typeof AddUserToOrgSchema>;

export const UpdateUserOrgRoleSchema = z.object({
  role_id: z.number().int().positive(),
});

export type UpdateUserOrgRoleInput = z.infer<typeof UpdateUserOrgRoleSchema>;

// Extended user with org context
export interface UserWithOrg {
  user_id: number;
  user_uuid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  org_id: number;
  org_uuid: string;
  org_name: string;
  org_slug: string;
  role_id: number;
  role_name: string;
  permissions: string[] | null;
  joined_at: Date;
  is_active: boolean;
}
