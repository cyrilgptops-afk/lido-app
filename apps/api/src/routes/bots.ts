import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { successResponse } from '../lib/response';
import { AppError } from '../middleware/errorHandler';

export const botsRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const deployBotSchema = z.object({
  name: z.string().min(1).max(100),
  integration: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  cronExpression: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /bots
 * List all bots for the authenticated user.
 */
botsRouter.get('/', async (req: Request, res: Response) => {
  // TODO: fetch from DB via Prisma
  const bots: unknown[] = [];
  res.json(successResponse(bots));
});

/**
 * POST /bots/deploy
 * Deploy a new bot instance.
 */
botsRouter.post(
  '/deploy',
  authenticate,
  validate(deployBotSchema),
  async (req: Request, res: Response) => {
    const { name, integration, config, cronExpression } = req.body as z.infer<typeof deployBotSchema>;

    // TODO: persist to DB and enqueue job
    const bot = {
      id: crypto.randomUUID(),
      userId: req.user!.sub,
      name,
      integration,
      config,
      cronExpression,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json(successResponse(bot));
  },
);

/**
 * GET /bots/:id
 * Get a single bot by ID.
 */
botsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: fetch from DB
  const bot = null;
  if (!bot) {
    throw new AppError(404, 'BOT_NOT_FOUND', `Bot with id "${id}" not found`);
  }

  res.json(successResponse(bot));
});

/**
 * DELETE /bots/:id
 * Soft-delete a bot.
 */
botsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: soft-delete in DB (set deletedAt)
  res.json(successResponse({ id, deletedAt: new Date().toISOString() }));
});
