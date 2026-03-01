/**
 * User-Organization Repository
 * 
 * Manages user memberships in organizations with roles.
 * Following Lido architecture: separate concerns, validate at boundaries.
 */

import { db } from '../lib/db';
import {
  UserOrganization,
  UserWithOrg,
  AddUserToOrgInput,
  UpdateUserOrgRoleInput,
  AddUserToOrgSchema,
  UpdateUserOrgRoleSchema,
} from '../models/user-organization.model';

export class UserOrganizationRepository {
  /**
   * Add user to organization with role
   */
  async addUserToOrg(input: AddUserToOrgInput): Promise<UserOrganization> {
    const validated = AddUserToOrgSchema.parse(input);

    const sql = `
      INSERT INTO user_organizations (
        user_id, org_id, role_id, invited_by
      ) VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.queryRaw(sql, [
      validated.user_id,
      validated.org_id,
      validated.role_id,
      validated.invited_by || null,
    ]);

    const insertId = (result as any).insertId;
    return this.findById(insertId);
  }

  /**
   * Find membership by ID
   */
  async findById(id: number): Promise<UserOrganization> {
    const sql = `
      SELECT * FROM user_organizations 
      WHERE id = ? AND deleted_at IS NULL
    `;
    const result = await db.queryOne<UserOrganization>(sql, [id]);
    if (!result) throw new Error('Membership not found');
    return result;
  }

  /**
   * Get user's organizations with roles
   */
  async getUserOrganizations(userId: number): Promise<UserWithOrg[]> {
    const sql = `
      SELECT 
        u.id as user_id, u.uuid as user_uuid, u.email, u.first_name, u.last_name, u.avatar_url,
        o.id as org_id, o.uuid as org_uuid, o.name as org_name, o.slug as org_slug,
        r.id as role_id, r.name as role_name, r.permissions,
        uo.joined_at, uo.is_active
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.id
      INNER JOIN organizations o ON uo.org_id = o.id
      INNER JOIN roles r ON uo.role_id = r.id
      WHERE uo.user_id = ? 
        AND uo.deleted_at IS NULL 
        AND u.deleted_at IS NULL 
        AND o.deleted_at IS NULL
      ORDER BY uo.joined_at DESC
    `;
    return db.query<UserWithOrg>(sql, [userId]);
  }

  /**
   * Get organization members with roles
   */
  async getOrganizationMembers(orgId: number): Promise<UserWithOrg[]> {
    const sql = `
      SELECT 
        u.id as user_id, u.uuid as user_uuid, u.email, u.first_name, u.last_name, u.avatar_url,
        o.id as org_id, o.uuid as org_uuid, o.name as org_name, o.slug as org_slug,
        r.id as role_id, r.name as role_name, r.permissions,
        uo.joined_at, uo.is_active
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.id
      INNER JOIN organizations o ON uo.org_id = o.id
      INNER JOIN roles r ON uo.role_id = r.id
      WHERE uo.org_id = ? 
        AND uo.deleted_at IS NULL 
        AND u.deleted_at IS NULL
      ORDER BY uo.joined_at ASC
    `;
    return db.query<UserWithOrg>(sql, [orgId]);
  }

  /**
   * Check if user is member of org
   */
  async isMember(userId: number, orgId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM user_organizations 
      WHERE user_id = ? AND org_id = ? AND deleted_at IS NULL AND is_active = TRUE
    `;
    const result = await db.queryOne<{ count: number }>(sql, [userId, orgId]);
    return (result?.count || 0) > 0;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(userId: number, orgId: number): Promise<UserWithOrg | null> {
    const sql = `
      SELECT 
        u.id as user_id, u.uuid as user_uuid, u.email, u.first_name, u.last_name, u.avatar_url,
        o.id as org_id, o.uuid as org_uuid, o.name as org_name, o.slug as org_slug,
        r.id as role_id, r.name as role_name, r.permissions,
        uo.joined_at, uo.is_active
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.id
      INNER JOIN organizations o ON uo.org_id = o.id
      INNER JOIN roles r ON uo.role_id = r.id
      WHERE uo.user_id = ? AND uo.org_id = ? 
        AND uo.deleted_at IS NULL 
        AND u.deleted_at IS NULL 
        AND o.deleted_at IS NULL
      LIMIT 1
    `;
    return db.queryOne<UserWithOrg>(sql, [userId, orgId]);
  }

  /**
   * Update user's role in organization
   */
  async updateUserRole(userId: number, orgId: number, input: UpdateUserOrgRoleInput): Promise<void> {
    const validated = UpdateUserOrgRoleSchema.parse(input);

    const sql = `
      UPDATE user_organizations 
      SET role_id = ?
      WHERE user_id = ? AND org_id = ? AND deleted_at IS NULL
    `;
    await db.queryRaw(sql, [validated.role_id, userId, orgId]);
  }

  /**
   * Remove user from organization (soft delete)
   */
  async removeUserFromOrg(userId: number, orgId: number): Promise<void> {
    const sql = `
      UPDATE user_organizations 
      SET deleted_at = NOW(), is_active = FALSE
      WHERE user_id = ? AND org_id = ? AND deleted_at IS NULL
    `;
    await db.queryRaw(sql, [userId, orgId]);
  }

  /**
   * Check if user has permission in org
   */
  async hasPermission(userId: number, orgId: number, permission: string): Promise<boolean> {
    const sql = `
      SELECT r.permissions
      FROM user_organizations uo
      INNER JOIN roles r ON uo.role_id = r.id
      WHERE uo.user_id = ? AND uo.org_id = ? 
        AND uo.deleted_at IS NULL AND uo.is_active = TRUE
      LIMIT 1
    `;
    const result = await db.queryOne<{ permissions: string }>(sql, [userId, orgId]);
    
    if (!result?.permissions) return false;

    try {
      const permissions: string[] = JSON.parse(result.permissions);
      return permissions.includes(permission) || permissions.includes('*');
    } catch {
      return false;
    }
  }
}

export const userOrganizationRepository = new UserOrganizationRepository();
