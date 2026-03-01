/**
 * User Repository - Pure user identity operations
 * 
 * Following Lido architecture:
 * - Validate at boundaries (input schemas)
 * - Soft deletes (deleted_at)
 * - No business logic (pure data access)
 * - No org/role logic (separate repositories)
 */

import { db } from '../lib/db';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserStatus,
  CreateUserSchema,
  UpdateUserSchema,
} from '../models/user.model';
import { randomUUID } from 'crypto';

export class UserRepository {
  /**
   * Find user by ID (excludes soft-deleted)
   */
  async findById(id: number): Promise<User | null> {
    const sql = `
      SELECT * FROM users 
      WHERE id = ? AND deleted_at IS NULL
    `;
    return db.queryOne<User>(sql, [id]);
  }

  /**
   * Find user by UUID
   */
  async findByUUID(uuid: string): Promise<User | null> {
    const sql = `
      SELECT * FROM users 
      WHERE uuid = ? AND deleted_at IS NULL
    `;
    return db.queryOne<User>(sql, [uuid]);
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL
    `;
    return db.queryOne<User>(sql, [email]);
  }

  /**
   * Create new user
   * Validate at boundaries (Lido principle)
   */
  async create(input: CreateUserInput): Promise<User> {
    const validated = CreateUserSchema.parse(input);
    const uuid = randomUUID();

    const sql = `
      INSERT INTO users (
        uuid, email, first_name, last_name, avatar_url,
        preferences, metadata, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const values = [
      uuid,
      validated.email,
      validated.first_name || null,
      validated.last_name || null,
      validated.avatar_url || null,
      validated.preferences ? JSON.stringify(validated.preferences) : null,
      validated.metadata ? JSON.stringify(validated.metadata) : null,
    ];

    const [result] = await db.queryRaw(sql, values);
    const insertId = (result as any).insertId;

    const user = await this.findById(insertId);
    if (!user) {
      throw new Error('User creation failed');
    }

    return user;
  }

  /**
   * Update user (partial update)
   */
  async update(id: number, input: UpdateUserInput): Promise<User> {
    const validated = UpdateUserSchema.parse(input);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.email !== undefined) {
      updates.push('email = ?');
      values.push(validated.email);
    }

    if (validated.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(validated.first_name);
    }

    if (validated.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(validated.last_name);
    }

    if (validated.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(validated.avatar_url);
    }

    if (validated.status !== undefined) {
      updates.push('status = ?');
      values.push(validated.status);
    }

    if (validated.preferences !== undefined) {
      updates.push('preferences = ?');
      values.push(JSON.stringify(validated.preferences));
    }

    if (validated.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(validated.metadata));
    }

    if (validated.email_verified_at !== undefined) {
      updates.push('email_verified_at = ?');
      values.push(validated.email_verified_at);
    }

    if (updates.length === 0) {
      const user = await this.findById(id);
      if (!user) throw new Error('User not found');
      return user;
    }

    values.push(id);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;

    await db.queryRaw(sql, values);

    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found after update');
    }

    return user;
  }

  /**
   * Soft delete (Lido best practice)
   */
  async softDelete(id: number): Promise<void> {
    const sql = `
      UPDATE users 
      SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;
    await db.queryRaw(sql, [id]);
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(id: number): Promise<void> {
    const sql = `
      UPDATE users 
      SET last_seen_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;
    await db.queryRaw(sql, [id]);
  }

  /**
   * List users with filters and pagination
   */
  async list(options: {
    limit?: number;
    offset?: number;
    status?: UserStatus;
    search?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];

    if (options.status) {
      conditions.push('status = ?');
      values.push(options.status);
    }

    if (options.search) {
      conditions.push(
        '(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'
      );
      const searchPattern = `%${options.search}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
    const countResult = await db.queryOne<{ total: number }>(countSql, values);
    const total = countResult?.total || 0;

    // Get users
    const sql = `
      SELECT * FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await db.query<User>(sql, [
      ...values,
      options.limit || 50,
      options.offset || 0,
    ]);

    return { users, total };
  }
}

export const userRepository = new UserRepository();
