import prisma from '../../lib/prisma';
import type { PermissionItem, RoleWithPermissions, RoleListItem } from './rbac.types';

export async function findAllPermissions(): Promise<PermissionItem[]> {
  return prisma.permission.findMany({
    orderBy: [{ resourceGroup: 'asc' }, { action: 'asc' }],
  });
}

export async function findAllRoles(): Promise<RoleListItem[]> {
  const roles = await prisma.roleModel.findMany({
    include: {
      _count: { select: { rolePermissions: true, userRoles: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionCount: r._count.rolePermissions,
    userCount: r._count.userRoles,
    createdAt: r.createdAt,
  }));
}

export async function findRoleById(id: string): Promise<RoleWithPermissions | null> {
  const row = await prisma.roleModel.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    permissions: row.rolePermissions.map((rp) => rp.permission),
    userCount: row._count.userRoles,
  };
}

export async function findRoleByName(name: string): Promise<{ id: string } | null> {
  return prisma.roleModel.findFirst({ where: { name }, select: { id: true } });
}

export async function createRole(data: {
  name: string;
  description: string;
  isSystem?: boolean;
  permissionIds: string[];
}): Promise<RoleWithPermissions> {
  const role = await prisma.roleModel.create({
    data: {
      name: data.name,
      description: data.description,
      isSystem: data.isSystem ?? false,
    },
  });

  if (data.permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: data.permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
    });
  }

  return (await findRoleById(role.id))!;
}

export async function updateRole(
  id: string,
  data: { name?: string; description?: string; permissionIds?: string[] },
): Promise<RoleWithPermissions> {
  if (data.name !== undefined || data.description !== undefined) {
    const updateData: { name?: string; description?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    await prisma.roleModel.update({ where: { id }, data: updateData });
  }

  if (data.permissionIds !== undefined) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }
  }

  return (await findRoleById(id))!;
}

export async function deleteRole(id: string): Promise<void> {
  await prisma.roleModel.delete({ where: { id } });
}

export async function countUsersByRoleId(roleId: string): Promise<number> {
  return prisma.userRole.count({ where: { roleId } });
}

export async function findPermissionsByRoleName(name: string): Promise<string[]> {
  const role = await prisma.roleModel.findUnique({
    where: { name },
    include: { rolePermissions: { include: { permission: true } } },
  });
  if (!role) return [];
  return role.rolePermissions.map((rp) => rp.permission.code);
}

export async function hasAnyOtherRoleWithPermission(
  permissionCode: string,
  excludeRoleId: string,
): Promise<boolean> {
  const count = await prisma.rolePermission.count({
    where: {
      permission: { code: permissionCode },
      roleId: { not: excludeRoleId },
    },
  });
  return count > 0;
}
