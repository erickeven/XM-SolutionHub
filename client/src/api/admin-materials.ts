import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type MaterialType = 'datasheet' | 'demo_report' | 'application_note' | 'other';
export type MaterialStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface AdminMaterialListItem {
  id: string;
  title: string;
  type: MaterialType;
  status: MaterialStatus;
  solutionId: string | null;
  productId: string | null;
  solutionName?: string;
  productModel?: string;
  mimeType: string;
  pageCount: number | null;
  previewPages: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMaterialDetail extends AdminMaterialListItem {
  originalStorageKey: string;
  previewStorageKey: string | null;
}

export interface AdminMaterialListResult {
  items: AdminMaterialListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListMaterialsParams {
  page?: number;
  pageSize?: number;
  status?: MaterialStatus | '';
  type?: MaterialType | '';
  solutionId?: string;
  productId?: string;
  search?: string;
}

export interface CreateMaterialFormInput {
  type: MaterialType;
  title: string;
  solutionId?: string;
  productId?: string;
  file: File;
}

export interface UpdateMaterialInput {
  title?: string;
  type?: MaterialType;
  solutionId?: string | null;
  productId?: string | null;
  status?: MaterialStatus;
}

export async function listMaterials(
  params: ListMaterialsParams,
): Promise<AdminMaterialListResult> {
  const { pageSize, ...rest } = params;
  const { data: res } = await apiClient.get<ApiResponse<AdminMaterialListResult>>(
    '/admin/materials',
    { params: { ...rest, limit: pageSize } },
  );
  return res.data;
}

export async function getMaterial(id: string): Promise<AdminMaterialDetail> {
  const { data: res } = await apiClient.get<ApiResponse<AdminMaterialDetail>>(
    `/admin/materials/${id}`,
  );
  return res.data;
}

export async function createMaterial(
  input: CreateMaterialFormInput,
): Promise<AdminMaterialDetail> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('type', input.type);
  form.append('title', input.title);
  if (input.solutionId) form.append('solutionId', input.solutionId);
  if (input.productId) form.append('productId', input.productId);
  // Let browser set multipart boundary — do NOT set Content-Type header
  const { data: res } = await apiClient.post<ApiResponse<AdminMaterialDetail>>(
    '/admin/materials',
    form,
    { headers: { 'Content-Type': undefined as unknown as string } },
  );
  return res.data;
}

export async function updateMaterial(
  id: string,
  input: UpdateMaterialInput,
): Promise<AdminMaterialDetail> {
  const { data: res } = await apiClient.patch<ApiResponse<AdminMaterialDetail>>(
    `/admin/materials/${id}`,
    input,
  );
  return res.data;
}

export async function deleteMaterial(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/materials/${id}`,
  );
  return res.data;
}

export function getMaterialPreviewUrl(id: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return `${base}/materials/${id}/preview`;
}
