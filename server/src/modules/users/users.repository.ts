import prisma from '../../lib/prisma';
import type { User, Prisma } from '@prisma/client';
import type { UpdateUserInput, UserListQuery } from './users.types';

const userRolesInclude = { include: { role: true } } as const;

type UserWithRoles = User & {
  userRoles: { role: { id: string; name: string } }[];
};

export async function findAll(
  query: UserListQuery,
): Promise<{ items: UserWithRoles[]; total: number }> {
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
      include: { userRoles: userRolesInclude },
    }),
    prisma.user.count({ where }),
  ]);

  return { items: items as UserWithRoles[], total };
}

export async function findById(id: string): Promise<UserWithRoles | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { userRoles: userRolesInclude },
  }) as Promise<UserWithRoles | null>;
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
): Promise<UserWithRoles> {
  const updateData: Record<string, unknown> = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;

  return prisma.user.update({
    where: { id },
    data: updateData as never,
    include: { userRoles: userRolesInclude },
  }) as Promise<UserWithRoles>;
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

export async function syncUserRoles(userId: string, roleIds: string[]): Promise<void> {
  await prisma.userRole.deleteMany({ where: { userId } });
  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }
}
