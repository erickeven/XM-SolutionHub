export interface PermissionItem {
  id: string;
  code: string;
  description: string;
  resourceGroup: string;
  action: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: PermissionItem[];
  userCount: number;
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: Date;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}
