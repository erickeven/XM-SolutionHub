export type UserRole = 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
export type UserStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface UserRoleItem {
  id: string;
  name: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  roleIds?: string[];
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  roleIds?: string[];
}

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  roles: UserRoleItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDetail {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  roles: UserRoleItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListQuery {
  page: number;
  pageSize: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface UserPaginatedResult {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}
