import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/authenticate';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { getStorageClient } from '../lib/storage';
import { successResponse, errorResponse } from '../lib/response';
import { BotScriptStorageService, BotScriptExecutor } from '@lido/connect';
import multer from 'multer';

const router = Router();
const storage = getStorageClient();
const botStorage = new BotScriptStorageService(storage, db, logger);
const botExecutor = new BotScriptExecutor(db, logger, {
  logsDir: path.join(__dirname, '..', '..', 'logs', 'bots'),
});
const upload = multer({ storage: multer.memoryStorage() });

// ─── Shared: resolve user + org from JWT ─────────────────────────────────────
async function resolveUserOrg(userUuid: string) {
  return db.queryOne<{ id: number; org_id: number }>(
    `SELECT u.id, uo.org_id
     FROM users u
     JOIN user_organizations uo ON u.id = uo.user_id
     WHERE u.uuid = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userUuid],
  );
}

// ─── Shared: bot SELECT columns ──────────────────────────────────────────────
const BOT_COLS = `
  id, uuid, name, description, type, display_name, avatar_url, config,
  version, is_active, deployed_version_id, created_at, updated_at
`;

// ─── Validation schemas ───────────────────────────────────────────────────────
const CreateBotSchema = z.object({
  name:         z.string().min(1).max(255),
  description:  z.string().max(2000).optional(),
  type:         z.enum(['chat', 'application']).default('chat'),
  display_name: z.string().max(255).optional(),
  avatar_url:   z.string().max(1000).optional(),
  config:       z.record(z.any()).optional(),
});

const UpdateBotSchema = z.object({
  name:         z.string().min(1).max(255).optional(),
  description:  z.string().max(2000).optional(),
  type:         z.enum(['chat', 'application']).optional(),
  display_name: z.string().max(255).optional().nullable(),
  avatar_url:   z.string().max(1000).optional().nullable(),
  config:       z.record(z.any()).optional().nullable(),
  is_active:    z.boolean().optional(),
});

// ─── Create Bot Script ──────────────────────────────────────────────────────

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const body = CreateBotSchema.parse(req.body);
    const userUuid = req.user!.sub;

    const userResult = await resolveUserOrg(userUuid);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const result: any = await db.queryRaw(
      `INSERT INTO bot_scripts
         (uuid, organization_id, name, description, type, display_name, avatar_url, config, version, is_active, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, '1.0.0', TRUE, NOW())`,
      [
        userResult.org_id,
        body.name,
        body.description ?? null,
        body.type,
        body.display_name ?? null,
        body.avatar_url   ?? null,
        body.config ? JSON.stringify(body.config) : null,
      ],
    );

    const createdBot = await db.queryOne(`SELECT ${BOT_COLS} FROM bot_scripts WHERE id = ?`, [result[0].insertId]);
    return res.status(201).json(successResponse(createdBot));
  } catch (error) {
    next(error);
  }
});

// ─── List All Bot Scripts ───────────────────────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userUuid = req.user!.sub;
    const typeFilter = req.query.type as string | undefined;

    const userResult = await resolveUserOrg(userUuid);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const params: any[] = [userResult.org_id];
    let typeClause = '';
    if (typeFilter === 'chat' || typeFilter === 'application') {
      typeClause = ' AND type = ?';
      params.push(typeFilter);
    }

    const bots = await db.query(
      `SELECT ${BOT_COLS} FROM bot_scripts
       WHERE organization_id = ? AND deleted_at IS NULL${typeClause}
       ORDER BY created_at DESC`,
      params,
    );

    return res.json(successResponse(bots));
  } catch (error) {
    next(error);
  }
});

// ─── Get Active Bots by Type ────────────────────────────────────────────────
// GET /bot-scripts/active?type=chat|application

router.get('/active', authenticate, async (req, res, next) => {
  try {
    const userUuid = req.user!.sub;
    const typeFilter = (req.query.type as string) ?? 'chat';

    const userResult = await resolveUserOrg(userUuid);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const bots = await db.query(
      `SELECT bs.id, bs.uuid, bs.name, bs.display_name, bs.avatar_url, bs.type, bs.config,
              bs.version, bsv.storage_key
       FROM bot_scripts bs
       LEFT JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
       WHERE bs.organization_id = ? AND bs.is_active = TRUE
         AND bs.type = ? AND bs.deleted_at IS NULL
       ORDER BY bs.created_at ASC`,
      [userResult.org_id, typeFilter],
    );

    return res.json(successResponse(bots));
  } catch (error) {
    next(error);
  }
});

// ─── Upload Bot Script Version ──────────────────────────────────────────────

router.post('/:id/versions', authenticate, requireRole('admin'), upload.single('script'), async (req, res, next) => {
  try {
    const botId = req.params.id;
    const { version, changelog } = req.body;
    const userUuid = req.user!.sub;

    // Get numeric user ID from UUID
    const userResult = await db.queryOne('SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL', [userUuid]);
    
    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const userId = userResult.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Script file is required' },
      });
    }

    // Validate syntax (basic check)
    const scriptContent = req.file.buffer.toString('utf-8');
    try {
      new Function(scriptContent); // Quick syntax check
    } catch (syntaxError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SYNTAX',
          message: syntaxError instanceof Error ? syntaxError.message : 'Invalid JavaScript syntax',
        },
      });
    }

    const result = await botStorage.uploadVersion(botId, version, scriptContent, userId, changelog);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ─── List Bot Script Versions ───────────────────────────────────────────────

router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const botId = req.params.id;
    const versions = await botStorage.listVersions(botId);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Download Bot Script Version ────────────────────────────────────────────

router.get('/:id/versions/:versionId/download', authenticate, async (req, res, next) => {
  try {
    const { versionId } = req.params;
    const result = await botStorage.downloadVersion(versionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="bot-script-${versionId}.js"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

// ─── Deploy Bot Script Version ──────────────────────────────────────────────

router.post('/:id/versions/:versionId/deploy', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id: botId, versionId } = req.params;
    const userUuid = req.user!.sub;

    // Get numeric user ID from UUID
    const userResult = await db.queryOne('SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL', [userUuid]);
    
    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const userId = userResult.id;

    // Download and load script into executor
    const downloadResult = await botStorage.downloadVersion(versionId);
    if (!downloadResult.success) {
      return res.status(404).json(downloadResult);
    }

    await botExecutor.loadScript(botId, downloadResult.data!);

    // Deploy version
    const deployResult = await botStorage.deployVersion(botId, versionId, userId);

    if (!deployResult.success) {
      return res.status(400).json(deployResult);
    }

    res.json({
      success: true,
      data: { message: 'Version deployed successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Get Deployment History ─────────────────────────────────────────────────

router.get('/:id/deployments', authenticate, async (req, res, next) => {
  try {
    const botId = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const history = await botStorage.getDeploymentHistory(botId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Delete Bot Script Version ──────────────────────────────────────────────

router.delete('/:id/versions/:versionId', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { versionId } = req.params;
    const result = await botStorage.deleteVersion(versionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: { message: 'Version deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Assign Bot to Conversation ─────────────────────────────────────────────

router.post('/assign', authenticate, async (req, res, next) => {
  try {
    const { conversationId, botId } = req.body;
    const userUuid = req.user!.sub;

    // Get numeric user ID from UUID
    const userResult = await db.queryOne('SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL', [userUuid]);
    
    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const userId = userResult.id;

    const sql = `
      INSERT INTO conversation_bots (conversation_id, bot_id, assigned_by, assigned_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE bot_id = VALUES(bot_id), assigned_by = VALUES(assigned_by), assigned_at = NOW()
    `;

    await db.queryRaw(sql, [conversationId, botId, userId]);

    res.json({
      success: true,
      data: { message: 'Bot assigned to conversation' },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Get Single Bot Script ──────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const botId = req.params.id;
    const userResult = await resolveUserOrg(req.user!.sub);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const bot = await db.queryOne(
      `SELECT ${BOT_COLS} FROM bot_scripts
       WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [botId, userResult.org_id],
    );

    if (!bot) return res.status(404).json(errorResponse('BOT_NOT_FOUND', 'Bot not found'));
    return res.json(successResponse(bot));
  } catch (error) {
    next(error);
  }
});

// ─── Update Bot Script ──────────────────────────────────────────────────────

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const botId = req.params.id;
    const body  = UpdateBotSchema.parse(req.body);
    const userResult = await resolveUserOrg(req.user!.sub);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const bot = await db.queryOne(
      'SELECT id FROM bot_scripts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL',
      [botId, userResult.org_id],
    );
    if (!bot) return res.status(404).json(errorResponse('BOT_NOT_FOUND', 'Bot not found'));

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[]        = [];

    if (body.name         !== undefined) { setClauses.push('name = ?');         params.push(body.name); }
    if (body.description  !== undefined) { setClauses.push('description = ?');  params.push(body.description); }
    if (body.type         !== undefined) { setClauses.push('type = ?');          params.push(body.type); }
    if (body.display_name !== undefined) { setClauses.push('display_name = ?'); params.push(body.display_name); }
    if (body.avatar_url   !== undefined) { setClauses.push('avatar_url = ?');   params.push(body.avatar_url); }
    if (body.config       !== undefined) { setClauses.push('config = ?');        params.push(body.config ? JSON.stringify(body.config) : null); }
    if (body.is_active    !== undefined) { setClauses.push('is_active = ?');     params.push(body.is_active); }

    params.push(botId);
    await db.queryRaw(`UPDATE bot_scripts SET ${setClauses.join(', ')} WHERE id = ?`, params);

    const updated = await db.queryOne(`SELECT ${BOT_COLS} FROM bot_scripts WHERE id = ?`, [botId]);
    return res.json(successResponse(updated));
  } catch (error) {
    next(error);
  }
});

// ─── Upload Bot Avatar ──────────────────────────────────────────────────────

router.post('/:id/avatar', authenticate, requireRole('admin'), upload.single('avatar'), async (req, res, next) => {
  try {
    const botId = req.params.id;
    const userResult = await resolveUserOrg(req.user!.sub);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const bot = await db.queryOne<{ id: number; avatar_url: string | null }>(
      'SELECT id, avatar_url FROM bot_scripts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL',
      [botId, userResult.org_id],
    );
    if (!bot) return res.status(404).json(errorResponse('BOT_NOT_FOUND', 'Bot not found'));

    if (!req.file) return res.status(400).json(errorResponse('FILE_REQUIRED', 'Avatar file is required'));

    // Delete old avatar if present
    if (bot.avatar_url) {
      await storage.delete('lido-assets', bot.avatar_url).catch(() => {});
    }

    const ext = req.file.originalname.split('.').pop() ?? 'png';
    const key = `bots/${botId}/avatar-${Date.now()}.${ext}`;
    const uploadResult = await storage.upload('lido-assets', key, req.file.buffer, { contentType: req.file.mimetype });
    if (!uploadResult.success) {
      return res.status(500).json(errorResponse('UPLOAD_FAILED', 'Avatar upload failed'));
    }

    await db.queryRaw('UPDATE bot_scripts SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [key, botId]);
    return res.json(successResponse({ avatar_url: key }));
  } catch (error) {
    next(error);
  }
});

// ─── Delete Bot Script ──────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const botId = req.params.id;
    const userResult = await resolveUserOrg(req.user!.sub);
    if (!userResult) {
      return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not associated with any organization'));
    }

    const bot = await db.queryOne(
      'SELECT id FROM bot_scripts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL',
      [botId, userResult.org_id],
    );
    if (!bot) return res.status(404).json(errorResponse('BOT_NOT_FOUND', 'Bot not found'));

    await db.queryRaw('UPDATE bot_scripts SET deleted_at = NOW() WHERE id = ?', [botId]);
    return res.json(successResponse({ message: 'Bot deleted successfully' }));
  } catch (error) {
    next(error);
  }
});

export default router;
