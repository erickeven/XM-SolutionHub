import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type SolutionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface AdminSolutionListItem {
  id: string;
  name: string;
  description: string;
  status: SolutionStatus;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  materialCount?: number;
}

export interface AdminSolutionDetail extends AdminSolutionListItem {
  productIds: string[];
}

export interface AdminSolutionListResult {
  items: AdminSolutionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListSolutionsParams {
  page?: number;
  pageSize?: number;
  status?: SolutionStatus | '';
  search?: string;
}

export interface CreateSolutionInput {
  name: string;
  description: string;
  productIds?: string[];
  status?: SolutionStatus;
}

export interface UpdateSolutionInput {
  name?: string;
  description?: string;
  productIds?: string[];
  status?: SolutionStatus;
}

export async function listSolutions(
  params: ListSolutionsParams,
): Promise<AdminSolutionListResult> {
  const { pageSize, ...rest } = params;
  const { data: res } = await apiClient.get<ApiResponse<AdminSolutionListResult>>(
    '/admin/solutions',
    { params: { ...rest, limit: pageSize } },
  );
  return res.data;
}

export async function getSolution(id: string): Promise<AdminSolutionDetail> {
  const { data: res } = await apiClient.get<ApiResponse<AdminSolutionDetail>>(
    `/admin/solutions/${id}`,
  );
  return res.data;
}

export async function createSolution(
  input: CreateSolutionInput,
): Promise<AdminSolutionDetail> {
  const { data: res } = await apiClient.post<ApiResponse<AdminSolutionDetail>>(
    '/admin/solutions',
    input,
  );
  return res.data;
}

export async function updateSolution(
  id: string,
  input: UpdateSolutionInput,
): Promise<AdminSolutionDetail> {
  const { data: res } = await apiClient.patch<ApiResponse<AdminSolutionDetail>>(
    `/admin/solutions/${id}`,
    input,
  );
  return res.data;
}

export async function deleteSolution(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/solutions/${id}`,
  );
  return res.data;
}
