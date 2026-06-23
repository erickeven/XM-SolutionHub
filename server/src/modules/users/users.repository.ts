import prisma from '../../lib/prisma';
import type { User, Prisma } from '@prisma/client';
import type { UpdateUserInput, UserListQuery } from './users.types';

export async function findAll(
  query: UserListQuery,
): Promise<{ items: User[]; total: number }> {
  const { page, pageSize, role, status, search } = query;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.email = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function create(
  data: { email: string; role: Prisma.UserCreateInput['role']; passwordHash: string },
): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      status: 'ACTIVE',
      privacyVersion: '1.0',
      privacyAcceptedAt: new Date(),
    },
  });
}

export async function update(
  id: string,
  data: UpdateUserInput & { passwordHash?: string },
): Promise<User> {
  const updateData: Record<string, unknown> = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;

  return prisma.user.update({ where: { id }, data: updateData as never });
}

export async function remove(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
