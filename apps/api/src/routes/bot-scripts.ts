import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authenticate';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { getStorageClient } from '../lib/storage';
import { BotScriptStorageService, BotScriptExecutor } from '@lido/connect';
import multer from 'multer';

const router = Router();
const storage = getStorageClient();
const botStorage = new BotScriptStorageService(storage, db, logger);
const botExecutor = new BotScriptExecutor(db, logger);
const upload = multer({ storage: multer.memoryStorage() });

// ─── Create Bot Script ──────────────────────────────────────────────────────

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userUuid = req.user!.sub; // This is UUID from JWT

    // Get user's numeric ID and organization from UUID
    const userSql = `
      SELECT u.id, uo.org_id 
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.uuid = ? AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const userResult = await db.queryOne(userSql, [userUuid]);

    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' },
      });
    }

    const sql = `
      INSERT INTO bot_scripts (uuid, organization_id, name, description, version, is_active, created_at)
      VALUES (UUID(), ?, ?, ?, '1.0.0', TRUE, NOW())
    `;

    const result: any = await db.queryRaw(sql, [userResult.org_id, name, description || null]);

    // Get the created bot with its UUID
    const createdBot = await db.queryOne(
      'SELECT id, uuid, name, description, version FROM bot_scripts WHERE id = ?',
      [result[0].insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        id: createdBot.id,
        uuid: createdBot.uuid,
        name: createdBot.name,
        description: createdBot.description,
        version: createdBot.version,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── List All Bot Scripts ───────────────────────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userUuid = req.user!.sub;

    // Get user's organization
    const userSql = `
      SELECT u.id, uo.org_id 
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.uuid = ? AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const userResult = await db.queryOne(userSql, [userUuid]);

    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' },
      });
    }

    // Get all bots for the organization
    const botsSql = `
      SELECT 
        id,
        uuid,
        name,
        description,
        version,
        is_active,
        created_at,
        updated_at
      FROM bot_scripts
      WHERE organization_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const bots = await db.query(botsSql, [userResult.org_id]);

    res.json({
      success: true,
      data: bots,
    });
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
    const userUuid = req.user!.sub;

    // Get user's organization
    const userSql = `
      SELECT u.id, uo.org_id 
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.uuid = ? AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const userResult = await db.queryOne(userSql, [userUuid]);

    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' },
      });
    }

    // Get the bot
    const botSql = `
      SELECT 
        id,
        uuid,
        name,
        description,
        version,
        is_active,
        deployed_version_id,
        created_at,
        updated_at
      FROM bot_scripts
      WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
    `;
    const bot = await db.queryOne(botSql, [botId, userResult.org_id]);

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOT_NOT_FOUND', message: 'Bot not found' },
      });
    }

    res.json({
      success: true,
      data: bot,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Delete Bot Script ──────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const botId = req.params.id;
    const userUuid = req.user!.sub;

    // Get user's organization
    const userSql = `
      SELECT u.id, uo.org_id 
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.uuid = ? AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const userResult = await db.queryOne(userSql, [userUuid]);

    if (!userResult) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' },
      });
    }

    // Verify bot exists and belongs to organization
    const bot = await db.queryOne(
      'SELECT id FROM bot_scripts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL',
      [botId, userResult.org_id]
    );

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOT_NOT_FOUND', message: 'Bot not found' },
      });
    }

    // Soft delete the bot
    await db.queryRaw(
      'UPDATE bot_scripts SET deleted_at = NOW() WHERE id = ?',
      [botId]
    );

    res.json({
      success: true,
      data: { message: 'Bot deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
