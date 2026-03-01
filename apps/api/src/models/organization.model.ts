/**
 * Organization Model - Independent
 * 
 * Organizations are separate from users.
 * Users join orgs via user_organizations join table.
 */

import { z } from 'zod';

export const OrgSettingsSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  max_bots: z.number().int().positive().optional(),
  max_integrations: z.number().int().positive().optional(),
  max_members: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
}).passthrough().optional();

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: z.infer<typeof OrgSettingsSchema>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  logo_url: z.string().url().optional(),
  settings: OrgSettingsSchema,
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
