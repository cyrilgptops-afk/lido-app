import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate';
import { successResponse, errorResponse } from '../lib/response';
import { env } from '../lib/env';

export const authRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/oauth/callback:
 *   post:
 *     tags:
 *       - Auth
 *     summary: OAuth callback
 *     description: Exchange OAuth authorization code for an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code
 *                 example: "auth_code_12345"
 *               state:
 *                 type: string
 *                 description: OAuth state parameter
 *                 example: "random_state_xyz"
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         tokenType:
 *                           type: string
 *                           example: "Bearer"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
authRouter.post(
  '/oauth/callback',
  validate(oauthCallbackSchema),
  async (req: Request, res: Response) => {
    const { code } = req.body as z.infer<typeof oauthCallbackSchema>;

    // TODO: exchange `code` with the OAuth provider, upsert user in DB
    const mockUser = { id: crypto.randomUUID(), email: 'user@example.com', role: 'user' as const };

    if (!mockUser) {
      res.status(401).json(errorResponse('AUTH_FAILED', 'OAuth authentication failed'));
      return;
    }

    const token = jwt.sign(
      { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );

    res.json(successResponse({ accessToken: token, tokenType: 'Bearer' }));
  },
);

/**
 * POST /auth/refresh
 * Placeholder for token refresh (implement with refresh-token rotation).
 */
authRouter.post('/refresh', (_req: Request, res: Response) => {
  res.status(501).json(errorResponse('NOT_IMPLEMENTED', 'Token refresh not yet implemented'));
});
