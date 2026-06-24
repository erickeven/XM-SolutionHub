import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { config } from '../config';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.headers) {
      for (const [key, value] of Object.entries(err.headers)) {
        res.setHeader(key, value);
      }
    }
    res.status(err.statusCode).json({ code: err.code, message: err.message, data: null });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({ code: 1001, message, data: null });
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({ code: 1001, message: 'Invalid JSON body', data: null });
    return;
  }

  config.logger.error({ err: { name: err instanceof Error ? err.name : 'Unknown', message: err instanceof Error ? err.message : String(err) } }, 'Unhandled error');
  res.status(500).json({ code: 5000, message: 'Internal Server Error', data: null });
}
