/**
 * Chat Routes - Lido Connect
 *
 * Handles chat messaging. On each user message:
 *  1. Persists the user message
 *  2. Finds the org's active deployed bot script (MinIO key from bot_script_versions)
 *  3. Loads + executes the JS via BotScriptExecutor (vm sandbox)
 *  4. Persists the bot response message
 *  5. Broadcasts both messages to the conversation room via Socket.IO
 */

import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { db } from '../lib/db';
import { successResponse, errorResponse } from '../lib/response';
import { getStorageClient } from '../lib/storage';
import { logger } from '../lib/logger';
import { getIO } from '../socket';
import { BotScriptExecutor } from '@lido/connect';
import type { BotContext } from '@lido/connect';
import multer from 'multer';
import crypto from 'crypto';
import { getNLPClient } from '../lib/nlp';
import type { NLPAdapter } from '../lib/nlp';
import { communicationConfig } from '../config';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  contentType: z.enum(['text', 'attachment', 'form_submit']).default('text'),
  formData: z.record(z.any()).optional(),
});

// ─── Bot script executor singleton (per-script cache lives inside executor) ──

const executor = new BotScriptExecutor(db, logger, {
  logsDir: path.join(__dirname, '..', '..', 'logs', 'bots'),
});

// ── NLP client (lazy init — fails silently so chat works without Rasa) ────────
let _nlpClient: NLPAdapter | null = null;
let _nlpInitFailed = false;
let _nlpRetryAfter = 0;

async function tryGetNLPClient(): Promise<NLPAdapter | null> {
  if (_nlpClient) return _nlpClient;
  // Back-off: don't retry more than once every 30 s after a failure
  if (_nlpInitFailed && Date.now() < _nlpRetryAfter) return null;
  try {
    _nlpClient = await getNLPClient();
    _nlpInitFailed = false;
    return _nlpClient;
  } catch {
    _nlpInitFailed = true;
    _nlpRetryAfter = Date.now() + 30_000;
    logger.warn('Rasa NLP unavailable — using keyword detection fallback');
    return null;
  }
}

// ─── Helper: map user text → intent key using bot's own intent list ──────────

// ─── Helper: resolve intent — delegates to the bot's own detectIntent() if
//     the script exports one; falls back to token-matching otherwise ─────────

function detectIntent(
  message: string,
  availableIntents: string[],
  botModule?: { keywords?: Record<string, string[]> },
): string {
  const lower = message.toLowerCase().trim();

  // 1. Bot's own keyword map — longest phrase first so 'change password'
  //    matches before the shorter 'password' token
  const keywordMap = botModule?.keywords ?? {};
  for (const [intent, keywords] of Object.entries(keywordMap)) {
    if (!availableIntents.includes(intent)) continue;
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    if (sorted.some((kw) => lower.includes(kw))) return intent;
  }

  // 2. Generic token-based fallback for bots with no keyword map
  //    e.g. 'reset_password' → test for 'reset' or 'password' in message
  for (const intent of availableIntents) {
    if (intent === '*') continue;
    const tokens = intent.split('_').filter((t) => t.length > 3);
    if (tokens.some((t) => lower.includes(t))) return intent;
  }

  return availableIntents.includes('*') ? '*' : (availableIntents[0] ?? '*');
}

// ─── Helper: download script text from MinIO ─────────────────────────────────

async function downloadBotScript(storageKey: string): Promise<string | null> {
  try {
    const storage = getStorageClient();
    const result = await storage.download('lido-bots', storageKey);
    if (!result.success || !result.stream) return null;

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      result.stream!.on('data', (chunk: Buffer) => chunks.push(chunk));
      result.stream!.on('end', resolve);
      result.stream!.on('error', reject);
    });
    return Buffer.concat(chunks).toString('utf-8');
  } catch (err) {
    logger.error({ err, storageKey }, 'Failed to download bot script');
    return null;
  }
}

// ─── GET /chat/active-bot ────────────────────────────────────────────────────

router.get('/active-bot', authenticate, async (req, res) => {
  try {
    const userUuid = req.user!.sub;
    const botIdParam = req.query.botId ? Number(req.query.botId) : null;

    const userResult = await db.queryOne(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    const userOrg = await db.queryOne(
      'SELECT org_id FROM user_organizations WHERE user_id = ? LIMIT 1',
      [userResult.id],
    );
    const orgId = userOrg?.org_id;
    if (!orgId) {
      return res.json(successResponse({ bot: null }));
    }

    const bot = await db.queryOne<{
      id: number;
      uuid: string;
      name: string;
      version: string;
      storage_key: string;
    }>(
      botIdParam
        ? `SELECT bs.id, bs.uuid, bs.name, bs.version, bsv.storage_key
           FROM bot_scripts bs
           JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
           WHERE bs.id = ? AND bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL`
        : `SELECT bs.id, bs.uuid, bs.name, bs.version, bsv.storage_key
           FROM bot_scripts bs
           JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
           WHERE bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL
           LIMIT 1`,
      botIdParam ? [botIdParam, orgId] : [orgId],
    );

    return res.json(successResponse({ bot: bot || null }));
  } catch (error) {
    logger.error({ error }, 'Fetch active bot failed');
    return res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch active bot'));
  }
});

// ─── POST /chat/messages ─────────────────────────────────────────────────────

router.post('/messages', authenticate, async (req, res) => {
  try {
    const { conversationId, content, contentType, formData } = SendMessageSchema.parse(req.body);
    const userUuid = req.user!.sub;

    // Resolve numeric user ID
    const userResult = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    const userId = userResult.id;

    // Resolve / create conversation
    let convUuid = conversationId;
    if (!convUuid) {
      convUuid = crypto.randomUUID();
      const userOrg = await db.queryOne<{ org_id: number }>(
        'SELECT org_id FROM user_organizations WHERE user_id = ? LIMIT 1',
        [userId],
      );
      const orgId = userOrg?.org_id ?? 1;
      await db.queryRaw(
        `INSERT INTO conversations (uuid, user_id, organization_id, type, status, created_at, updated_at)
         VALUES (?, ?, ?, 'user_bot', 'active', NOW(), NOW())`,
        [convUuid, userId, orgId],
      );
    }

    const conv = await db.queryOne<{ id: number; organization_id: number; bot_script_id?: number | null }>(
      'SELECT id, organization_id, bot_script_id FROM conversations WHERE uuid = ? AND deleted_at IS NULL',
      [convUuid],
    );
    if (!conv) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Conversation not found'));
    }

    // ── Persist user message ─────────────────────────────────────────────
    const messageUuid = crypto.randomUUID();
    await db.queryRaw(
      `INSERT INTO messages (uuid, conversation_id, sender_id, sender_type, content, content_type, created_at)
       VALUES (?, ?, ?, 'user', ?, ?, NOW())`,
      [messageUuid, conv.id, userId, content, contentType || 'text'],
    );
    await db.queryRaw('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conv.id]);

    const io = getIO();

    // Broadcast user message to conversation room
    io?.to(`conversation:${convUuid}`).emit('chat:message', {
      uuid: messageUuid,
      conversationId: convUuid,
      sender_type: 'user',
      content,
      content_type: contentType || 'text',
      created_at: new Date().toISOString(),
    });

    let botMessageResult: {
      uuid: string; content: string;
      metadata: Record<string, any>; created_at: string;
    } | null = null;

    // ── Find the bot for this conversation (specific bot if pinned, else any active) ──
    const botRow = await db.queryOne<{
      id: number;
      uuid: string;
      name: string;
      storage_key: string;
    }>(
      conv.bot_script_id
        ? `SELECT bs.id, bs.uuid, bs.name, bsv.storage_key
           FROM bot_scripts bs
           JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
           WHERE bs.id = ? AND bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL`
        : `SELECT bs.id, bs.uuid, bs.name, bsv.storage_key
           FROM bot_scripts bs
           JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
           WHERE bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL
           LIMIT 1`,
      conv.bot_script_id ? [conv.bot_script_id, conv.organization_id] : [conv.organization_id],
    );

    if (botRow) {
      // ── Load script into executor (uses internal cache) ────────────────
      const botCacheKey = `${botRow.id}-${botRow.storage_key}`;
      try {
        // Only download + load if not already cached
        if (!(executor as any).scriptCache?.has(botCacheKey)) {
          const scriptCode = await downloadBotScript(botRow.storage_key);
          if (scriptCode) {
            await executor.loadScript(botCacheKey, scriptCode);
          }
        }

        // ── Detect intent from user message ──────────────────────────────
        const botModule = (executor as any).scriptCache?.get(botCacheKey);
        // 'init' is reserved as the greeting-only handler; exclude it from
        // normal message routing so user messages never land on it.
        const availableIntents = botModule
          ? Object.keys(botModule.intents ?? {}).filter((k) => k !== 'init')
          : ['*'];

        // ── Try Rasa NLP first (graceful fallback to keyword detection) ───
        // Skip NLP + keyword detection entirely for form submissions —
        // always route directly to the 'form_submit' intent handler.
        let nlpIntent: string | null = null;
        let nlpEntities: Array<{ entity: string; value: string }> = [];
        let nlpConfidence: number | undefined;

        if (contentType === 'form_submit') {
          nlpIntent = 'form_submit';
        } else {
          const nlp = await tryGetNLPClient();
          if (nlp) {
            const nlpResult = await nlp.parseMessage(content, convUuid).catch(() => null);
            if (
              nlpResult?.success &&
              nlpResult.data &&
              nlpResult.data.intent.confidence >= communicationConfig.nlp.confidenceThreshold &&
              availableIntents.includes(nlpResult.data.intent.name)
            ) {
              nlpIntent     = nlpResult.data.intent.name;
              nlpConfidence = nlpResult.data.intent.confidence;
              nlpEntities   = nlpResult.data.entities.map((e) => ({ entity: e.entity, value: e.value }));
              logger.info(
                { intent: nlpIntent, confidence: nlpConfidence, entities: nlpEntities.length },
                'Intent resolved via Rasa NLP',
              );
            }
          }
        }

        const detectedIntent = nlpIntent ?? detectIntent(content, availableIntents, botModule);

        // ── Build execution context ──────────────────────────────────────
        const context: BotContext = {
          userId: userUuid,
          organizationId: String(conv.organization_id),
          conversationId: convUuid,
          messageId: messageUuid,
          userMessage: content,
          contentType: contentType ?? 'text',
          formData: formData ?? undefined,
          intent: detectedIntent,
          entities: nlpEntities,
          metadata: {
            nlpResolved:   nlpIntent !== null,
            nlpConfidence: nlpConfidence,
          },
        };

        // ── Execute bot script ───────────────────────────────────────────
        const botResponse = await executor.execute(botCacheKey, detectedIntent, context);

        // ── Build metadata payload (form, table, actions, suggestions) ───
        const botMetadata = {
          suggestions: Array.isArray(botResponse.suggestions) ? botResponse.suggestions : [],
          form:        botResponse.form    ?? null,
          table:       botResponse.table   ?? null,
          actions:     botResponse.actions ?? null,
          intent:      detectedIntent,
        };

        // ── Persist bot response message ─────────────────────────────────
        const botMsgUuid = crypto.randomUUID();
        const botMsgCreatedAt = new Date().toISOString();

        // Build result early so it is returned even if the INSERT below fails
        botMessageResult = {
          uuid: botMsgUuid,
          content: botResponse.message,
          metadata: botMetadata,
          created_at: botMsgCreatedAt,
        };

        // sender_id must reference users(id) — use the requesting user's numeric ID
        await db.queryRaw(
          `INSERT INTO messages (uuid, conversation_id, sender_id, sender_type, content, content_type, nlp_suggestions, metadata, created_at)
           VALUES (?, ?, ?, 'bot', ?, 'text', ?, ?, NOW())`,
          [
            botMsgUuid,
            conv.id,
            userId,
            botResponse.message,
            botMetadata.suggestions.length ? JSON.stringify(botMetadata.suggestions) : null,
            JSON.stringify(botMetadata),
          ],
        );
        await db.queryRaw('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conv.id]);

        // ── Broadcast bot message to conversation room ───────────────────
        io?.to(`conversation:${convUuid}`).emit('chat:message', {
          uuid: botMsgUuid,
          conversationId: convUuid,
          sender_type: 'bot',
          content: botResponse.message,
          content_type: 'text',
          metadata: botMetadata,
          created_at: botMsgCreatedAt,
        });

        logger.info({ botId: botRow.id, convUuid, botMsgUuid, intent: detectedIntent }, 'Bot response sent');
      } catch (botErr) {
        // Bot execution failure must not break user message acknowledgement
        logger.error({ botErr, botId: botRow.id }, 'Bot script execution error');
      }
    }

    return res.json(
      successResponse({ messageId: messageUuid, conversationId: convUuid, botMessage: botMessageResult }),
    );
  } catch (error) {
    logger.error({ error, requestId: req.id }, 'Send message failed');
    return res.status(500).json(errorResponse('SEND_FAILED', 'Failed to send message'));
  }
});

// ─── POST /chat/attachments ──────────────────────────────────────────────────

router.post('/attachments', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('MISSING_FILE', 'No file uploaded'));
    }

    const userUuid = req.user!.sub;
    const userResult = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    const key = `chat-attachments/${userResult.id}/${Date.now()}-${req.file.originalname}`;
    const storageClient = getStorageClient();
    const uploadResult = await storageClient.upload('lido-uploads', key, req.file.buffer, {
      contentType: req.file.mimetype,
    });

    if (!uploadResult.success) {
      return res.status(500).json(errorResponse('UPLOAD_FAILED', uploadResult.error?.message ?? 'Upload failed'));
    }

    return res.json(successResponse({ attachmentKey: key }));
  } catch (error) {
    logger.error({ error }, 'Attachment upload failed');
    return res.status(500).json(errorResponse('UPLOAD_FAILED', 'Failed to upload attachment'));
  }
});

// ─── GET /chat/conversations/:conversationId/messages ────────────────────────

router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userUuid = req.user!.sub;
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const offset = parseInt((req.query.offset as string) ?? '0', 10);

    const userResult = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;

    const rawMessages = await db.query(
      `SELECT m.uuid, m.content, m.content_type, m.attachment_key, m.sender_type,
              m.nlp_intent, m.nlp_entities, m.nlp_confidence, m.nlp_suggestions, m.metadata, m.created_at
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.uuid = ? AND c.user_id = ? AND c.deleted_at IS NULL AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [conversationId, userResult.id],
    ) as any[];

    // Parse stored JSON fields before sending to client
    const messages = rawMessages.reverse().map((m) => ({
      ...m,
      nlp_suggestions: safeParseJSON(m.nlp_suggestions, []),
      metadata:        safeParseJSON(m.metadata, null),
    }));

    return res.json(successResponse({ messages }));
  } catch (error) {
    logger.error({ error }, 'Fetch messages failed');
    return res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch messages'));
  }
});

// ─── POST /chat/conversations ────────────────────────────────────────────────

router.post('/conversations', authenticate, async (req, res) => {
  try {
    const userUuid = req.user!.sub;
    const { type, organizationId, botScriptId } = req.body;

    const userResult = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    const userId = userResult.id;

    let orgId = organizationId;
    if (!orgId) {
      const userOrg = await db.queryOne<{ org_id: number }>(
        'SELECT org_id FROM user_organizations WHERE user_id = ? LIMIT 1',
        [userId],
      );
      orgId = userOrg?.org_id ?? 1;
    }

    const uuid = crypto.randomUUID();
    if (botScriptId) {
      await db.queryRaw(
        `INSERT INTO conversations (uuid, user_id, organization_id, bot_script_id, type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [uuid, userId, orgId, botScriptId, type ?? 'user_bot'],
      );
    } else {
      await db.queryRaw(
        `INSERT INTO conversations (uuid, user_id, organization_id, type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
        [uuid, userId, orgId, type ?? 'user_bot'],
      );
    }

    const convRow = await db.queryOne<{ id: number; uuid: string; type: string; status: string; created_at: string }>(
      'SELECT id, uuid, type, status, created_at FROM conversations WHERE uuid = ?',
      [uuid],
    );
    const conversation = convRow
      ? { uuid: convRow.uuid, type: convRow.type, status: convRow.status, created_at: convRow.created_at }
      : null;

    // ── Trigger bot greeting (non-critical — failure must not abort conversation creation) ─────
    let initialMessage: {
      uuid: string; sender_type: 'bot'; content: string;
      content_type: string; metadata: Record<string, any>; created_at: string;
    } | null = null;

    if (convRow) {
      try {
        const greetBotRow = await db.queryOne<{ id: number; name: string; storage_key: string }>(
          botScriptId
            ? `SELECT bs.id, bs.name, bsv.storage_key
               FROM bot_scripts bs
               JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
               WHERE bs.id = ? AND bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL`
            : `SELECT bs.id, bs.name, bsv.storage_key
               FROM bot_scripts bs
               JOIN bot_script_versions bsv ON bsv.id = bs.deployed_version_id
               WHERE bs.organization_id = ? AND bs.is_active = TRUE AND bs.deleted_at IS NULL
               LIMIT 1`,
          botScriptId ? [botScriptId, orgId] : [orgId],
        );

        if (greetBotRow) {
          const greetCacheKey = `${greetBotRow.id}-${greetBotRow.storage_key}`;
          if (!(executor as any).scriptCache?.has(greetCacheKey)) {
            const scriptCode = await downloadBotScript(greetBotRow.storage_key);
            if (scriptCode) await executor.loadScript(greetCacheKey, scriptCode);
          }

          // Pick the greeting intent: 'init' is always used when present (it is
          // the designated greeting/welcome handler). Fall back to 'account_help',
          // then the first non-wildcard handler, then '*'.
          const greetModule = (executor as any).scriptCache?.get(greetCacheKey);

          // If the script failed to load (MinIO unavailable, file missing, etc.)
          // skip execution entirely — we can't run any handler.
          if (!greetModule) {
            logger.warn({ orgId, storageKey: greetBotRow.storage_key }, 'Bot script not loaded — skipping greeting');
            // fall through to end of `if (greetBotRow)` block; initialMessage stays null
          } else {
          const greetIntentKeys: string[] = Object.keys(greetModule.intents ?? {});
          const greetIntent = greetIntentKeys.includes('init')
            ? 'init'
            : greetIntentKeys.includes('account_help')
              ? 'account_help'
              : (greetIntentKeys.find((k) => k !== '*') ?? '*');

          const greetContext: BotContext = {
            userId: userUuid,
            organizationId: String(orgId),
            conversationId: uuid,
            messageId: crypto.randomUUID(),
            userMessage: '',
            intent: greetIntent,
            entities: [],
          };

          const greetResponse = await executor.execute(greetCacheKey, greetIntent, greetContext);
          const greetMeta = {
            suggestions: Array.isArray(greetResponse.suggestions) ? greetResponse.suggestions : [],
            form:    greetResponse.form    ?? null,
            table:   greetResponse.table   ?? null,
            actions: greetResponse.actions ?? null,
            intent:  greetIntent,
          };

          const greetMsgUuid = crypto.randomUUID();
          const greetCreatedAt = new Date().toISOString();

          await db.queryRaw(
            `INSERT INTO messages (uuid, conversation_id, sender_id, sender_type, content, content_type, nlp_suggestions, metadata, created_at)
             VALUES (?, ?, ?, 'bot', ?, 'text', ?, ?, NOW())`,
            [
              greetMsgUuid,
              convRow.id,
              userId,
              greetResponse.message,
              greetMeta.suggestions.length ? JSON.stringify(greetMeta.suggestions) : null,
              JSON.stringify(greetMeta),
            ],
          );

          initialMessage = {
            uuid: greetMsgUuid,
            sender_type: 'bot',
            content: greetResponse.message,
            content_type: 'text',
            metadata: greetMeta,
            created_at: greetCreatedAt,
          };

          logger.info({ convId: uuid, greetMsgUuid }, 'Bot greeting stored for new conversation');
          } // end else (greetModule loaded)
        }
      } catch (greetErr) {
        logger.warn({ greetErr }, 'Bot greeting failed — continuing without initial message');
      }
    }

    return res.status(201).json(successResponse({ conversation, initialMessage }));
  } catch (error) {
    logger.error({ error }, 'Create conversation failed');
    return res.status(500).json(errorResponse('CREATE_FAILED', 'Failed to create conversation'));
  }
});

// ─── GET /chat/conversations ─────────────────────────────────────────────────

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userUuid = req.user!.sub;
    const userResult = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL',
      [userUuid],
    );
    if (!userResult) {
      return res.status(403).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    const conversations = await db.query(
      `SELECT c.uuid, c.type, c.status, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) AS message_count,
              (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM conversations c
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       ORDER BY c.updated_at DESC`,
      [userResult.id],
    );

    return res.json(successResponse({ conversations }));
  } catch (error) {
    logger.error({ error }, 'Fetch conversations failed');
    return res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch conversations'));
  }
});

export default router;
