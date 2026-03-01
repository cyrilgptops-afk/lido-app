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
 * @openapi
 * /bots:
 *   get:
 *     tags:
 *       - Bots
 *     summary: List all bots
 *     description: Get all bots for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bots
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Bot'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
botsRouter.get('/', async (req: Request, res: Response) => {
  // TODO: fetch from DB via Prisma
  const bots: unknown[] = [];
  res.json(successResponse(bots));
});

/**
 * @openapi
 * /bots/deploy:
 *   post:
 *     tags:
 *       - Bots
 *     summary: Deploy a new bot
 *     description: Create and deploy a new bot instance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - integration
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "My Dropbox Sync"
 *               integration:
 *                 type: string
 *                 example: "dropbox"
 *               config:
 *                 type: object
 *                 additionalProperties: true
 *                 example: { "syncFolder": "/Documents" }
 *               cronExpression:
 *                 type: string
 *                 example: "0 *6 * * *"
 *                 description: "Cron expression for scheduled runs (optional)"
 *     responses:
 *       200:
 *         description: Bot deployed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Bot'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
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
