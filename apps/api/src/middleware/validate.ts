import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../lib/response';

type Target = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates `req[target]` against a Zod schema.
 * On failure, responds 400 with a structured validation error.
 */
export function validate(schema: AnyZodObject, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = (result.error as ZodError).flatten().fieldErrors;
      res.status(400).json({
        ...errorResponse('VALIDATION_ERROR', 'Request validation failed'),
        details,
      });
      return;
    }

    // Replace with parsed (and potentially coerced) data
    req[target] = result.data;
    next();
  };
}
