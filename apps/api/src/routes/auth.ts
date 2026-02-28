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
 * POST /auth/oauth/callback
 * Exchange an OAuth authorization code for an access token.
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
