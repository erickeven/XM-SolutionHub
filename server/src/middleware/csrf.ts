import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from '../lib/errors';

const STATE_CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function csrfMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!STATE_CHANGING.includes(req.method as typeof STATE_CHANGING[number])) {
    return next();
  }

  // Origin header validation for state-changing requests
  const origin = req.headers.origin;
  if (origin && origin !== config.WEB_ORIGIN) {
    throw new AppError(2005, 'CSRF token validation failed', 403);
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['csrf-token'];

  if (
    typeof headerToken !== 'string' ||
    !headerToken ||
    typeof cookieToken !== 'string' ||
    !cookieToken ||
    headerToken !== cookieToken
  ) {
    throw new AppError(2005, 'CSRF token validation failed', 403);
  }

  next();
}