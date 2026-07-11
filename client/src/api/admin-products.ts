import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface ProductParamsInput {
  inputVoltageMin?: number;
  inputVoltageMax?: number;
  outputVoltage?: number;
  outputCurrent?: number;
  applicationType?: string;
  efficiencyLevel?: string;
  standbyPowerMax?: number;
  maxAmbientTemp?: number;
  certifications?: string[];
  requiresPfc?: boolean;
  [key: string]: unknown;
}

export interface AdminProductListItem {
  id: string;
  model: string;
  series: string;
  status: ProductStatus;
  params: ProductParamsInput | null;
  advantages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetail extends AdminProductListItem {
  datasheetMaterialId: string | null;
  solutionCount?: number;
  materialCount?: number;
}

export interface AdminProductListResult {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  status?: ProductStatus | '';
  search?: string;
}

export interface CreateProductInput {
  model: string;
  series: string;
  params: ProductParamsInput;
  advantages: string[];
  datasheetMaterialId?: string | null;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  model?: string;
  series?: string;
  params?: ProductParamsInput;
  advantages?: string[];
  datasheetMaterialId?: string | null;
  status?: ProductStatus;
}

export async function listProducts(
  params: ListProductsParams,
): Promise<AdminProductListResult> {
  // Backend expects `limit` not `pageSize`
  const { pageSize, ...rest } = params;
  const { data: res } = await apiClient.get<ApiResponse<AdminProductListResult>>(
    '/admin/products',
    { params: { ...rest, limit: pageSize } },
  );
  return res.data;
}

export async function getProduct(id: string): Promise<AdminProductDetail> {
  const { data: res } = await apiClient.get<ApiResponse<AdminProductDetail>>(
    `/admin/products/${id}`,
  );
  return res.data;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<AdminProductDetail> {
  const { data: res } = await apiClient.post<ApiResponse<AdminProductDetail>>(
    '/admin/products',
    input,
  );
  return res.data;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<AdminProductDetail> {
  const { data: res } = await apiClient.patch<ApiResponse<AdminProductDetail>>(
    `/admin/products/${id}`,
    input,
  );
  return res.data;
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/products/${id}`,
  );
  return res.data;
}

export async function hardDeleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/admin/products/${id}/permanent`);
}
