import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { PaginatedProducts, ProductDetail } from '../types/product';

export async function getProducts(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<PaginatedProducts> {
  const { data } = await apiClient.get<ApiResponse<PaginatedProducts>>('/products', { params });
  return data.data;
}

export async function getProductById(id: string): Promise<ProductDetail> {
  const { data } = await apiClient.get<ApiResponse<ProductDetail>>(`/products/${id}`);
  return data.data;
}