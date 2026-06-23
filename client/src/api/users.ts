import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface UserListItem {
  id: string;
  email: string;
  role: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface UserListResult {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
}

export interface UpdateUserInput {
  email?: string;
  role?: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export async function listUsers(
  params: ListUsersParams,
): Promise<UserListResult> {
  const { data: res } = await apiClient.get<ApiResponse<UserListResult>>(
    '/admin/users',
    { params },
  );
  return res.data;
}

export async function createUser(
  input: CreateUserInput,
): Promise<UserListItem> {
  const { data: res } = await apiClient.post<ApiResponse<UserListItem>>(
    '/admin/users',
    input,
  );
  return res.data;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserListItem> {
  const { data: res } = await apiClient.patch<ApiResponse<UserListItem>>(
    `/admin/users/${id}`,
    input,
  );
  return res.data;
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/users/${id}`,
  );
  return res.data;
}
