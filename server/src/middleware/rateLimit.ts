import type { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';
import { AppError } from '../lib/errors';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyBuilder?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyBuilder } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = keyBuilder?.(req) ?? req.user?.userId ?? req.ip ?? 'unknown';
      const key = `rate:${identifier}:${req.method}:${req.baseUrl}${req.path}`;

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

function authRateLimitKey(req: Request): string {
  const body = req.body as { email?: unknown } | undefined;
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : 'anonymous';
  return `${req.ip ?? 'unknown'}:${email}`;
}

const authRateLimitMax = process.env.NODE_ENV === 'test' ? 10_000 : 30;

export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  max: authRateLimitMax,
  keyBuilder: authRateLimitKey,
});
export const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
export const eventLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
