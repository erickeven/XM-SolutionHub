import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../config';
import { AppError } from '../lib/errors';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
}

const accessSecret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as AuthUser['role'],
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(2001, 'Invalid or expired token', 401));
    }
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as AuthUser['role'],
    };
    next();
  } catch {
    next(new AppError(2001, 'Invalid or expired token', 401));
  }
}
