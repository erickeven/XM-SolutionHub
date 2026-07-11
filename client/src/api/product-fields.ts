import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { FieldConfigItem } from './admin-product-fields';

export async function listPublicProductFields(): Promise<FieldConfigItem[]> {
  const { data: response } = await apiClient.get<ApiResponse<FieldConfigItem[]>>(
    '/product-fields',
  );
  return response.data;
}

export function usePublicProductFields() {
  return useQuery({
    queryKey: ['public-product-fields'],
    queryFn: listPublicProductFields,
    staleTime: 5 * 60 * 1000,
  });
}
