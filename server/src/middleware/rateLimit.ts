import type { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';
import { AppError } from '../lib/errors';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.user?.userId || req.ip || 'unknown';
      const key = `rate:${identifier}:${req.path}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }

      if (count > max) {
        const ttl = await redis.ttl(key);
        const retryAfter = ttl > 0 ? ttl : windowSec;
        throw new AppError(3001, 'Too many requests', 429, {
          'Retry-After': String(retryAfter),
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export const authLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
export const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
export const eventLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });