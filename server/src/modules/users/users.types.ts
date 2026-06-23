export type UserRole = 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
export type UserStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDetail extends UserListItem {}

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
