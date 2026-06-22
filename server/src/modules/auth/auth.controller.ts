import type { Request, Response, NextFunction } from 'express';
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

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await authService.register(parsed);
    res.status(201).json(successResponse(result));
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
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());
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
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());
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