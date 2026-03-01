import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';
import { errorResponse } from '../lib/response';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: 'user' | 'admin' | 'agent';
  iat?: number;
  exp?: number;
}

/** Extends Express Request with the decoded JWT payload */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      requestId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing or malformed Authorization header'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json(errorResponse('TOKEN_EXPIRED', 'Access token has expired'));
      return;
    }
    res.status(401).json(errorResponse('INVALID_TOKEN', 'Invalid access token'));
  }
}

/** Guard that requires a specific role claim */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}
