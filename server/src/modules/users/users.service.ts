import bcrypt from 'bcrypt';
import { AppError } from '../../lib/errors';
import { logFromContext } from '../audit/audit.service';
import * as repository from './users.repository';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
  UserPaginatedResult,
  UserListItem,
  UserDetail,
} from './users.types';

function extractRoles(u: {
  userRoles?: { role: { id: string; name: string } }[];
}): { id: string; name: string }[] {
  if (!u.userRoles) return [];
  return u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name }));
}

function toListItem(u: {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userRoles?: { role: { id: string; name: string } }[];
}): UserListItem {
  return {
    id: u.id,
    email: u.email,
    role: u.role as UserListItem['role'],
    status: u.status as UserListItem['status'],
    roles: extractRoles(u),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function toDetail(u: {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userRoles?: { role: { id: string; name: string } }[];
}): UserDetail {
  return {
    id: u.id,
    email: u.email,
    role: u.role as UserDetail['role'],
    status: u.status as UserDetail['status'],
    roles: extractRoles(u),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function listUsers(
  query: UserListQuery,
): Promise<UserPaginatedResult> {
  const { items, total } = await repository.findAll(query);
  return {
    items: items.map(toListItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getUser(id: string): Promise<UserDetail> {
  const user = await repository.findById(id);
  if (!user) {
    throw new AppError(4001, 'User not found', 404);
  }
  return toDetail(user);
}

export async function createUser(
  adminActorId: string,
  data: CreateUserInput,
): Promise<UserDetail> {
  const existing = await repository.findByEmail(data.email);
  if (existing) {
    throw new AppError(4002, 'Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await repository.create({
    email: data.email,
    role: data.role,
    passwordHash,
  });

  if (data.roleIds && data.roleIds.length > 0) {
    await repository.syncUserRoles(user.id, data.roleIds);
  }

  logFromContext({
    actorId: adminActorId,
    action: 'user.create',
    targetType: 'User',
    targetId: user.id,
    payload: { email: data.email, role: data.role, roleIds: data.roleIds },
  });

  return toDetail({ ...user, userRoles: [] });
}

export async function updateUser(
  adminActorId: string,
  id: string,
  data: UpdateUserInput,
): Promise<UserDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'User not found', 404);
  }

  if (data.email && data.email !== existing.email) {
    const emailTaken = await repository.findByEmail(data.email);
    if (emailTaken) {
      throw new AppError(4002, 'Email already registered', 409);
    }
  }

  if (data.roleIds !== undefined) {
    await repository.syncUserRoles(id, data.roleIds);
  }

  const user = await repository.update(id, data);

  // PRD §7.6 item 8: disable user → revoke ALL refresh tokens
  if (data.status === 'INACTIVE') {
    await repository.revokeAllRefreshTokens(id);
  }

  logFromContext({
    actorId: adminActorId,
    action: 'user.update',
    targetType: 'User',
    targetId: id,
    payload: data as Record<string, unknown>,
  });

  return toDetail(user);
}

export async function deleteUser(
  adminActorId: string,
  id: string,
): Promise<void> {
  if (adminActorId === id) {
    throw new AppError(4003, 'Cannot delete your own account', 400);
  }

  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'User not found', 404);
  }

  // Revoke all refresh tokens before deletion
  await repository.revokeAllRefreshTokens(id);
  await repository.remove(id);

  logFromContext({
    actorId: adminActorId,
    action: 'user.delete',
    targetType: 'User',
    targetId: id,
    payload: { email: existing.email },
  });
}
