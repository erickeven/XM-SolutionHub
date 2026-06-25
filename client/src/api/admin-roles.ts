import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface PermissionItem {
  id: string;
  code: string;
  description: string;
  resourceGroup: string;
  action: string;
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

export interface RoleDetail extends RoleListItem {
  permissions: PermissionItem[];
}

export interface RoleListResult {
  items: RoleListItem[];
  total: number;
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

export async function listRoles(): Promise<RoleListItem[]> {
  const { data: res } = await apiClient.get<ApiResponse<RoleListResult>>(
    '/admin/roles',
  );
  return res.data.items;
}

export async function getRole(id: string): Promise<RoleDetail> {
  const { data: res } = await apiClient.get<ApiResponse<RoleDetail>>(
    `/admin/roles/${id}`,
  );
  return res.data;
}

export async function createRole(input: CreateRoleInput): Promise<RoleDetail> {
  const { data: res } = await apiClient.post<ApiResponse<RoleDetail>>(
    '/admin/roles',
    input,
  );
  return res.data;
}

export async function updateRole(
  id: string,
  input: UpdateRoleInput,
): Promise<RoleDetail> {
  const { data: res } = await apiClient.patch<ApiResponse<RoleDetail>>(
    `/admin/roles/${id}`,
    input,
  );
  return res.data;
}

export async function deleteRole(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/roles/${id}`,
  );
  return res.data;
}

export async function listPermissions(): Promise<PermissionItem[]> {
  const { data: res } = await apiClient.get<
    ApiResponse<{ items: PermissionItem[] }>
  >('/admin/roles/permissions');
  return res.data.items;
}

export function groupPermissionsByResource(
  permissions: PermissionItem[],
): Record<string, PermissionItem[]> {
  return permissions.reduce<Record<string, PermissionItem[]>>((acc, p) => {
    const group = p.resourceGroup || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});
}

// React Query hooks
const ROLES_QUERY_KEY = ['admin-roles'];
const PERMISSIONS_QUERY_KEY = ['admin-permissions'];

export function useRoles() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: listRoles,
  });
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: [...ROLES_QUERY_KEY, id],
    queryFn: () => (id ? getRole(id) : Promise.reject(new Error('no id'))),
    enabled: !!id,
  });
}

export function usePermissionList() {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: listPermissions,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleInput }) =>
      updateRole(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
