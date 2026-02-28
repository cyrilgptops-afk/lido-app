import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { errorResponse } from '../lib/response';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Catches unhandled errors and returns a consistent JSON error response */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message));
    return;
  }

  logger.error({ err, requestId: req.requestId, userId: req.user?.sub }, 'Unhandled error');

  res.status(500).json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
  );
}

/** 404 handler – must be registered after all routes */
export function notFound(req: Request, res: Response): void {
  res.status(404).json(errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}
