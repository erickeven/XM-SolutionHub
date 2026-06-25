import prisma from '../../lib/prisma';
import type { User, RefreshToken, PasswordResetToken } from '@prisma/client';

interface UserWithPermissions extends User {
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      rolePermissions: Array<{
        permission: { code: string };
      }>;
    };
  }>;
}

export async function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  role: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
  privacyVersion: string;
  privacyAcceptedAt: Date;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      status: 'ACTIVE',
      privacyVersion: data.privacyVersion,
      privacyAcceptedAt: data.privacyAcceptedAt,
    },
  });
}

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      familyId: data.familyId,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findRefreshTokenByHash(
  tokenHash: string,
): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeRefreshTokenFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function createPasswordResetToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findPasswordResetTokenByHash(
  tokenHash: string,
): Promise<PasswordResetToken | null> {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateUserStatus(
  userId: string,
  status: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { status: status as 'DRAFT' | 'ACTIVE' | 'INACTIVE' },
  });
}

export async function findByEmailWithPermissions(email: string): Promise<UserWithPermissions | null> {
  return prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  }) as unknown as UserWithPermissions | null;
}

export async function findByIdWithPermissions(userId: string): Promise<UserWithPermissions | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  }) as unknown as UserWithPermissions | null;
}