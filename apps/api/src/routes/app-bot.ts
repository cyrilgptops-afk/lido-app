/**
 * App Bot Routes
 *
 * Executes application-type bot scripts and returns dynamic UI layouts.
 * The bot JS returns { layout: AppComponent[] } instead of a chat message.
 * The frontend renders each component using the AppRenderer.
 */

import path   from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import { z }      from 'zod';
import { authenticate }                  from '../middleware/authenticate';
import { db }                            from '../lib/db';
import { successResponse, errorResponse } from '../lib/response';
import { getStorageClient }              from '../lib/storage';
import { logger }                        from '../lib/logger';
import { BotScriptExecutor }             from '@lido/connect';
import type { BotContext }               from '@lido/connect';

const router   = Router();

// Separate executor instance so app-bot cache never collides with chat cache.
// App bots can perform multi-page API calls so allow a longer execution window.
const executor = new BotScriptExecutor(db, logger, {
  logsDir           : path.join(__dirname, '..', '..', 'logs', 'bots'),
  executionTimeoutMs: 30_000, // 30 s — allows fetching many API pages
});

const ExecuteSchema = z.object({
  intent: z.string().min(1).default('init'),
  params: z.record(z.any()).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveUserOrg(userUuid: string) {
  return db.queryOne<{ userId: number; orgId: number }>(
    `SELECT u.id AS userId, uo.org_id AS orgId
     FROM users u
     JOIN user_organizations uo ON u.id = uo.user_id
     WHERE u.uuid = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userUuid],
  );
}

async function downloadBotScript(storageKey: string): Promise<string | null> {
  try {
    const storage = getStorageClient();
    const result  = await storage.download('lido-bots', storageKey);
    if (!result.success || !result.stream) return null;
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      result.stream!.on('data',  (chunk: Buffer) => chunks.push(chunk));
      result.stream!.on('end',   resolve);
      result.stream!.on('error', reject);
    });
    return Buffer.concat(chunks).toString('utf-8');
  } catch (err) {
    logger.error({ err, storageKey }, 'Failed to download app bot script');
    return null;
  }
}

// ─── GET /app-bots/:botId  — bot info ────────────────────────────────────────

router.get('/:botId', authenticate, async (req, res, next) => {
  try {
    const ctx = await resolveUserOrg(req.user!.sub);
    if (!ctx) return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not in any organization'));

    const bot = await db.queryOne<{
      id: number; uuid: string; name: string; display_name: string | null;
      avatar_url: string | null; version: string; storage_key: string | null;
    }>(
      `SELECT bs.id, bs.uuid, bs.name, bs.display_name, bs.avatar_url, bs.version,
              bsv.storage_key
       FROM bot_scripts bs
       LEFT JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
       WHERE bs.id = ? AND bs.organization_id = ? AND bs.type = 'application'
         AND bs.is_active = TRUE AND bs.deleted_at IS NULL`,
      [req.params.botId, ctx.orgId],
    );

    if (!bot) return res.status(404).json(errorResponse('NOT_FOUND', 'Application bot not found'));
    return res.json(successResponse(bot));
  } catch (err) { next(err); }
});

// ─── POST /app-bots/:botId/execute  — execute intent ────────────────────────

router.post('/:botId/execute', authenticate, async (req, res, next) => {
  try {
    const ctx = await resolveUserOrg(req.user!.sub);
    if (!ctx) return res.status(403).json(errorResponse('NO_ORGANIZATION', 'User not in any organization'));

    const { intent, params } = ExecuteSchema.parse(req.body);

    const botRow = await db.queryOne<{ id: number; name: string; storage_key: string }>(
      `SELECT bs.id, bs.name, bsv.storage_key
       FROM bot_scripts bs
       JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
       WHERE bs.id = ? AND bs.organization_id = ? AND bs.type = 'application'
         AND bs.is_active = TRUE AND bs.deleted_at IS NULL`,
      [req.params.botId, ctx.orgId],
    );

    if (!botRow) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Application bot not found or not deployed'));
    }

    // Prefix 'app-' so the cache key never collides with chat bot cache keys
    const cacheKey = `app-${botRow.id}-${botRow.storage_key}`;

    if (!(executor as any).scriptCache?.has(cacheKey)) {
      const scriptCode = await downloadBotScript(botRow.storage_key);
      if (!scriptCode) {
        return res.status(502).json(errorResponse('SCRIPT_UNAVAILABLE', 'Bot script could not be loaded'));
      }
      await executor.loadScript(cacheKey, scriptCode);
    }

    const botModule          = (executor as any).scriptCache?.get(cacheKey);
    const availableIntents: string[] = Object.keys(botModule?.intents ?? {});

    const resolvedIntent = availableIntents.includes(intent)
      ? intent
      : availableIntents.includes('*') ? '*' : (availableIntents[0] ?? 'init');

    const context: BotContext = {
      userId         : req.user!.sub,
      organizationId : String(ctx.orgId),
      conversationId : `app-${botRow.id}`,
      messageId      : crypto.randomUUID(),
      userMessage    : intent,
      intent         : resolvedIntent,
      entities       : [],
      metadata       : { ...(params ?? {}) },
    };

    const result = await executor.execute(cacheKey, resolvedIntent, context) as any;

    logger.info({
      event  : 'app_bot.executed',
      botId  : botRow.id,
      intent : resolvedIntent,
      orgId  : ctx.orgId,
    });

    return res.json(successResponse({
      layout : Array.isArray(result.layout) ? result.layout : [],
      message: result.message ?? null,
    }));
  } catch (err: any) {
    logger.error({ err }, 'App bot execution failed');
    return res.status(500).json(errorResponse('EXECUTION_FAILED', err?.message ?? 'Bot execution failed'));
  }
});

export default router;
