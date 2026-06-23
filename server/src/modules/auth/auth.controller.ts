import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { config } from '../../config';
import { successResponse } from '../../lib/response';
import { AppError } from '../../lib/errors';
import * as authService from './auth.service';
import {
  registerSchema,
  loginSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
} from './auth.schema';

const REFRESH_COOKIE = 'refreshToken';
const CSRF_COOKIE = 'csrf-token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

function setSessionCookies(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  res.cookie(CSRF_COOKIE, randomBytes(32).toString('hex'), csrfCookieOptions());
}

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await authService.register(parsed);
    setSessionCookies(res, result.refreshToken);
    res.status(201).json(successResponse({
      user: result.user,
      accessToken: result.accessToken,
    }));
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed);
    setSessionCookies(res, result.refreshToken);
    res.status(200).json(
      successResponse({
        user: result.user,
        accessToken: result.accessToken,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new AppError(2004, 'Missing refresh token', 401);
    }
    const csrfToken = req.headers['x-csrf-token'];
    if (typeof csrfToken !== 'string' || !csrfToken) {
      throw new AppError(2001, 'Missing CSRF token', 401);
    }
    const result = await authService.refresh(refreshToken, csrfToken);
    setSessionCookies(res, result.refreshToken);
    res.status(200).json(successResponse({ accessToken: result.accessToken }));
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: 0 });
    res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: 0 });
    res.status(200).json(successResponse(null));
  } catch (err) {
    next(err);
  }
}

export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const user = await authService.me(req.user.userId);
    res.status(200).json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

export async function passwordResetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = passwordResetSchema.parse(req.body);
    const result = await authService.passwordReset(parsed.email);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function passwordResetConfirmHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = passwordResetConfirmSchema.parse(req.body);
    await authService.passwordResetConfirm(parsed.token, parsed.newPassword);
    res.status(200).json(successResponse(null));
  } catch (err) {
    next(err);
  }
}
