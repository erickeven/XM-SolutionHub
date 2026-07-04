import { AppError } from '../../lib/errors';
import * as repository from './rbac.repository';
import type {
  PermissionItem,
  RoleWithPermissions,
  RoleListItem,
  CreateRoleInput,
  UpdateRoleInput,
} from './rbac.types';

interface PermissionGroup {
  resourceGroup: string;
  permissions: PermissionItem[];
}

export async function listPermissions(): Promise<PermissionGroup[]> {
  const all = await repository.findAllPermissions();
  const map = new Map<string, PermissionItem[]>();
  for (const p of all) {
    const group = map.get(p.resourceGroup);
    if (group) {
      group.push(p);
    } else {
      map.set(p.resourceGroup, [p]);
    }
  }
  return Array.from(map.entries()).map(([resourceGroup, permissions]) => ({
    resourceGroup,
    permissions,
  }));
}

export async function listRoles(): Promise<RoleListItem[]> {
  return repository.findAllRoles();
}

export async function getRole(id: string): Promise<RoleWithPermissions> {
  const role = await repository.findRoleById(id);
  if (!role) {
    throw new AppError(4101, 'Role not found', 404);
  }
  return role;
}

export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
  const existing = await repository.findRoleByName(input.name);
  if (existing) {
    throw new AppError(4102, 'Role name already exists', 409);
  }

  if (input.permissionIds.length > 0) {
    const validIds = new Set(
      (await repository.findAllPermissions()).map((p) => p.id),
    );
    const invalid = input.permissionIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new AppError(4103, `Invalid permission IDs: ${invalid.join(', ')}`, 400);
    }
  }

  return repository.createRole({
    name: input.name,
    description: input.description,
    permissionIds: input.permissionIds,
  });
}

export async function updateRole(
  id: string,
  input: UpdateRoleInput,
): Promise<RoleWithPermissions> {
  const existing = await repository.findRoleById(id);
  if (!existing) {
    throw new AppError(4101, 'Role not found', 404);
  }

  if (input.permissionIds !== undefined && input.permissionIds.length > 0) {
    const validIds = new Set(
      (await repository.findAllPermissions()).map((p) => p.id),
    );
    const invalid = input.permissionIds.filter((pid) => !validIds.has(pid));
    if (invalid.length > 0) {
      throw new AppError(4103, `Invalid permission IDs: ${invalid.join(', ')}`, 400);
    }
  }

  const updateData: { name?: string; description?: string; permissionIds?: string[] } = {
    permissionIds: input.permissionIds,
  };

  // ponytail: isSystem roles can't change name/description, only permissions
  if (!existing.isSystem) {
    if (input.name !== undefined) {
      const nameTaken = await repository.findRoleByName(input.name);
      if (nameTaken && nameTaken.id !== id) {
        throw new AppError(4102, 'Role name already exists', 409);
      }
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
  }

  return repository.updateRole(id, updateData);
}

export async function deleteRole(id: string): Promise<void> {
  const existing = await repository.findRoleById(id);
  if (!existing) {
    throw new AppError(4101, 'Role not found', 404);
  }

  const userCount = await repository.countUsersByRoleId(id);
  if (userCount > 0) {
    throw new AppError(4104, `Cannot delete role with ${userCount} assigned user(s)`, 409);
  }

  if (existing.isSystem) {
    const hasOtherAdmin = await repository.hasAnyOtherRoleWithPermission(
      'admin.dashboard.read',
      id,
    );
    if (!hasOtherAdmin) {
      throw new AppError(4105, 'Cannot delete the last administrative role', 403);
    }
  }

  await repository.deleteRole(id);
}
