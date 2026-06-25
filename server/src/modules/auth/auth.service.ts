import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { randomBytes, createHash } from 'crypto';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import redis from '../../lib/redis';
import * as repository from './auth.repository';
import type {
  RegisterInput,
  LoginInput,
  LoginResult,
  RefreshResult,
  UserInfo,
  PasswordResetResult,
  UserRole,
  UserStatus,
} from './auth.types';

const accessSecret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL = 900; // 15 minutes
const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function lockoutKey(email: string): string {
  return `login:fail:${email}`;
}

function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function extractPermissions(userWithRoles: {
  userRoles?: Array<{
    role?: {
      id: string;
      name: string;
      rolePermissions?: Array<{
        permission?: { code: string };
      }>;
    };
  }>;
}): { permissions: string[]; roles: Array<{ id: string; name: string }> } {
  const permSet = new Set<string>();
  const roles: Array<{ id: string; name: string }> = [];

  for (const ur of userWithRoles.userRoles ?? []) {
    if (ur.role) {
      roles.push({ id: ur.role.id, name: ur.role.name });
      for (const rp of ur.role.rolePermissions ?? []) {
        if (rp.permission?.code) {
          permSet.add(rp.permission.code);
        }
      }
    }
  }

  return { permissions: Array.from(permSet).sort(), roles };
}

function toUserInfo(
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
  },
  opts?: { permissions?: string[]; roles?: Array<{ id: string; name: string }> },
): UserInfo {
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    permissions: opts?.permissions ?? [],
    roles: opts?.roles,
  };
}

async function signAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
  familyId: string;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    familyId: payload.familyId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

async function checkLockout(email: string): Promise<void> {
  const count = await redis.get(lockoutKey(email));
  if (count && parseInt(count, 10) >= MAX_ATTEMPTS) {
    throw new AppError(2003, 'Account temporarily locked due to too many failed attempts', 429, { 'Retry-After': String(LOCKOUT_TTL) });
  }
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = lockoutKey(email);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, LOCKOUT_TTL);
  }
}

async function clearLockout(email: string): Promise<void> {
  await redis.del(lockoutKey(email));
}

export async function register(input: RegisterInput): Promise<LoginResult> {
  const existing = await repository.findByEmail(input.email);
  if (existing) {
    throw new AppError(2002, 'Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await repository.createUser({
    email: input.email,
    passwordHash,
    role: 'USER',
    privacyVersion: '1.0',
    privacyAcceptedAt: new Date(),
  });

  const familyId = randomBytes(16).toString('hex');
  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId,
  });

  const refreshToken = generateRefreshToken();
  await repository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return {
    user: toUserInfo(user),
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await repository.findByEmailWithPermissions(input.email);
  if (!user) {
    throw new AppError(2001, 'Invalid email or password', 401);
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(2001, 'Invalid email or password', 401);
  }

  await checkLockout(user.email);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    await recordFailedAttempt(user.email);
    throw new AppError(2001, 'Invalid email or password', 401);
  }

  await clearLockout(user.email);

  const familyId = randomBytes(16).toString('hex');
  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await repository.createRefreshToken({
    userId: user.id,
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  const { permissions, roles } = extractPermissions(user);

  return {
    user: toUserInfo(user, { permissions, roles }),
    accessToken,
    refreshToken,
  };
}

export async function refresh(
  refreshToken: string,
  csrfToken: string,
): Promise<RefreshResult> {
  if (!csrfToken) {
    throw new AppError(2001, 'Missing CSRF token', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await repository.findRefreshTokenByHash(tokenHash);

  if (!stored) {
    throw new AppError(2004, 'Invalid refresh token', 401);
  }

  // Reuse detection: revoked token presented again → revoke entire family
  if (stored.revokedAt) {
    await repository.revokeRefreshTokenFamily(stored.familyId);
    throw new AppError(2006, 'Refresh token reuse detected', 401);
  }

  if (stored.expiresAt < new Date()) {
    throw new AppError(2005, 'Refresh token expired', 401);
  }

  // Rotate: revoke old, issue new in same family
  await repository.revokeRefreshToken(stored.id);

  const user = await repository.findById(stored.userId);
  if (!user) {
    throw new AppError(2001, 'User not found', 401);
  }
  if (user.status !== 'ACTIVE') {
    await repository.revokeRefreshTokenFamily(stored.familyId);
    throw new AppError(2003, 'Account is inactive', 403);
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  await repository.createRefreshToken({
    userId: user.id,
    tokenHash: newRefreshTokenHash,
    familyId: stored.familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId: stored.familyId,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const stored = await repository.findRefreshTokenByHash(tokenHash);
  if (stored && !stored.revokedAt) {
    await repository.revokeRefreshToken(stored.id);
  }
}

export async function me(userId: string): Promise<UserInfo> {
  const user = await repository.findByIdWithPermissions(userId);
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(2001, 'User not found', 401);
  }
  const { permissions, roles } = extractPermissions(user);
  return toUserInfo(user, { permissions, roles });
}

export async function passwordReset(email: string): Promise<PasswordResetResult> {
  const user = await repository.findByEmail(email);
  if (!user) {
    // Don't reveal whether email exists
    return { resetLink: '' };
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  await repository.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  // DEV MODE: return reset link directly instead of sending email
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;
  return { resetLink };
}

export async function passwordResetConfirm(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashToken(token);
  const stored = await repository.findPasswordResetTokenByHash(tokenHash);

  if (!stored) {
    throw new AppError(2007, 'Invalid password reset token', 400);
  }

  if (stored.usedAt) {
    throw new AppError(2007, 'Password reset token already used', 400);
  }

  if (stored.expiresAt < new Date()) {
    throw new AppError(2008, 'Password reset token expired', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await repository.updateUserPassword(stored.userId, passwordHash);
  await repository.revokeAllRefreshTokensForUser(stored.userId);
  await repository.markPasswordResetTokenUsed(stored.id);
}
