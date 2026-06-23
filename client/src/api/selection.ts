import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { MatchResult, SelectionInput } from '../types/selection';
import type { Product } from '../types/product';

export async function matchProducts(input: SelectionInput): Promise<MatchResult[]> {
  const { data } = await apiClient.post<ApiResponse<MatchResult[]>>('/selection/match', input);
  return data.data;
}

export async function getPopularProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<ApiResponse<Product[]>>('/selection/popular');
  return data.data;
}
