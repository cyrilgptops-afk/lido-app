/**
 * Admin Routes
 * CRUD operations for users, organizations, and members
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { userRepository } from '../repositories/user.repository';
import { userOrganizationRepository } from '../repositories/user-organization.repository';
import { UserStatus } from '../models/user.model';
import storageRouter from './storage';

const router = Router();

// Mount storage routes for logo uploads
router.use('/storage', storageRouter);

// ========== USERS ==========

// List users
router.get('/users', async (req, res, next) => {
  try {
    const { id, uuid, email, search, status, limit, offset } = req.query;

    // Get single user
    if (id) {
      const user = await userRepository.findById(Number(id));
      return res.json({ success: true, data: user });
    }

    if (uuid) {
      const user = await userRepository.findByUUID(String(uuid));
      return res.json({ success: true, data: user });
    }

    if (email) {
      const user = await userRepository.findByEmail(String(email));
      return res.json({ success: true, data: user });
    }

    // List users
    const result = await userRepository.list({
      search: search ? String(search) : undefined,
      status: status as UserStatus | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// Create user
router.post('/users', async (req, res, next) => {
  try {
    const user = await userRepository.create(req.body);
    return res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// Update user
router.put('/users', async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const user = await userRepository.update(Number(id), req.body);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// Delete user
router.delete('/users', async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    await userRepository.softDelete(Number(id));
    return res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    next(error);
  }
});

// ========== ORGANIZATIONS ==========

// List organizations
router.get('/organizations', async (req, res, next) => {
  try {
    const { id, uuid, slug } = req.query;

    if (id) {
      const sql = 'SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL';
      const org = await db.queryOne(sql, [Number(id)]);
      return res.json({ success: true, data: org });
    }

    if (uuid) {
      const sql = 'SELECT * FROM organizations WHERE uuid = ? AND deleted_at IS NULL';
      const org = await db.queryOne(sql, [String(uuid)]);
      return res.json({ success: true, data: org });
    }

    if (slug) {
      const sql = 'SELECT * FROM organizations WHERE slug = ? AND deleted_at IS NULL';
      const org = await db.queryOne(sql, [String(slug)]);
      return res.json({ success: true, data: org });
    }

    // List all organizations
    const sql = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM user_organizations uo 
         WHERE uo.org_id = o.id AND uo.deleted_at IS NULL) as member_count
      FROM organizations o
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
    `;
    const orgs = await db.query(sql);

    return res.json({ success: true, data: orgs });
  } catch (error: any) {
    next(error);
  }
});

// Create organization
router.post('/organizations', async (req, res, next) => {
  try {
    const { name, slug, logo_url, settings } = req.body;

    const sql = `
      INSERT INTO organizations (uuid, name, slug, logo_url, settings)
      VALUES (UUID(), ?, ?, ?, ?)
    `;

    const [result] = await db.queryRaw(sql, [
      name,
      slug,
      logo_url || null,
      settings ? JSON.stringify(settings) : null,
    ]);

    const insertId = (result as any).insertId;
    const org = await db.queryOne('SELECT * FROM organizations WHERE id = ?', [insertId]);

    return res.status(201).json({ success: true, data: org });
  } catch (error: any) {
    next(error);
  }
});

// Update organization
router.put('/organizations', async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const { name, slug, logo_url, settings } = req.body;
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      values.push(slug);
    }
    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      values.push(logo_url);
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    values.push(Number(id));

    const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`;
    await db.queryRaw(sql, values);

    const org = await db.queryOne('SELECT * FROM organizations WHERE id = ?', [Number(id)]);
    return res.json({ success: true, data: org });
  } catch (error: any) {
    next(error);
  }
});

// Delete organization
router.delete('/organizations', async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const sql = 'UPDATE organizations SET deleted_at = NOW() WHERE id = ?';
    await db.queryRaw(sql, [Number(id)]);

    return res.json({ success: true, message: 'Organization deleted' });
  } catch (error: any) {
    next(error);
  }
});

// ========== MEMBERS ==========

// Get members
router.get('/members', async (req, res, next) => {
  try {
    const { userId, orgId } = req.query;

    if (userId) {
      // Get user's organizations
      const orgs = await userOrganizationRepository.getUserOrganizations(Number(userId));
      return res.json({ success: true, data: orgs });
    }

    if (orgId) {
      // Get organization members
      const members = await userOrganizationRepository.getOrganizationMembers(Number(orgId));
      return res.json({ success: true, data: members });
    }

    return res.status(400).json({ success: false, error: 'userId or orgId required' });
  } catch (error: any) {
    next(error);
  }
});

// Add member
router.post('/members', async (req, res, next) => {
  try {
    const { user_id, org_id, role_id, invited_by } = req.body;

    const membership = await userOrganizationRepository.addUserToOrg({
      user_id,
      org_id,
      role_id,
      invited_by,
    });

    return res.status(201).json({ success: true, data: membership });
  } catch (error: any) {
    next(error);
  }
});

// Update member role
router.put('/members', async (req, res, next) => {
  try {
    const { userId, orgId } = req.query;
    const { role_id } = req.body;

    if (!userId || !orgId) {
      return res.status(400).json({ success: false, error: 'userId and orgId required' });
    }

    await userOrganizationRepository.updateUserRole(Number(userId), Number(orgId), { role_id });

    return res.json({ success: true, message: 'Role updated' });
  } catch (error: any) {
    next(error);
  }
});

// Remove member
router.delete('/members', async (req, res, next) => {
  try {
    const { userId, orgId } = req.query;

    if (!userId || !orgId) {
      return res.status(400).json({ success: false, error: 'userId and orgId required' });
    }

    await userOrganizationRepository.removeUserFromOrg(Number(userId), Number(orgId));

    return res.json({ success: true, message: 'Member removed' });
  } catch (error: any) {
    next(error);
  }
});

// ========== ROLES ==========

// Get roles
router.get('/roles', async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM roles ORDER BY name';
    const roles = await db.query(sql);
    return res.json({ success: true, data: roles });
  } catch (error: any) {
    next(error);
  }
});

export { router as adminRouter };
