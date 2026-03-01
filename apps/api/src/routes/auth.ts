import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validate } from '../middleware/validate';
import { successResponse, errorResponse } from '../lib/response';
import { env } from '../lib/env';
import { db } from '../lib/db';

export const authRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Development login
 *     description: Simple email/password login for development (bypasses real auth)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@lido.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     tokenType:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 */
authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    try {
      // Query user with role from database
      const userSql = `
        SELECT 
          u.id,
          u.uuid,
          u.email,
          u.password_hash,
          u.first_name,
          u.last_name,
          u.status,
          r.name as role_name
        FROM users u
        JOIN user_organizations uo ON u.id = uo.user_id
        JOIN roles r ON uo.role_id = r.id
        WHERE u.email = ? AND u.deleted_at IS NULL
        LIMIT 1
      `;

      const user = await db.queryOne(userSql, [email]);

      if (!user) {
        return res.status(401).json(errorResponse('AUTH_FAILED', 'Invalid email or password'));
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json(errorResponse('ACCOUNT_INACTIVE', 'Your account is inactive or suspended'));
      }

      // Verify password (MD5 hash)
      const passwordHash = crypto.createHash('md5').update(password).digest('hex');
      
      if (user.password_hash !== passwordHash) {
        return res.status(401).json(errorResponse('AUTH_FAILED', 'Invalid email or password'));
      }

      // Generate JWT with role
      const token = jwt.sign(
        { 
          sub: user.uuid,
          email: user.email,
          role: user.role_name === 'owner' || user.role_name === 'admin' ? 'admin' : 'user'
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
      );

      res.json(
        successResponse({
          accessToken: token,
          tokenType: 'Bearer',
          user: {
            id: user.uuid,
            email: user.email,
            role: user.role_name === 'owner' || user.role_name === 'admin' ? 'admin' : 'user',
            firstName: user.first_name,
            lastName: user.last_name,
          },
        })
      );
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'An error occurred during login'));
    }
  }
);

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
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
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
