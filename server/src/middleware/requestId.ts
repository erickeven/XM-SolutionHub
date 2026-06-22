import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}