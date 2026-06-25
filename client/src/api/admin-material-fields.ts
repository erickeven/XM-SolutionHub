import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type FieldType = 'text' | 'number' | 'single_select' | 'multi_select' | 'boolean';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FieldConfigItem {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  optionsJson: FieldOption[] | null;
  sortOrder: number;
  enabled: boolean;
  validationJson: FieldValidation | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldConfigInput {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required?: boolean;
  optionsJson?: FieldOption[] | null;
  sortOrder?: number;
  enabled?: boolean;
  validationJson?: FieldValidation | null;
}

export interface UpdateFieldConfigInput {
  label?: string;
  fieldType?: FieldType;
  required?: boolean;
  optionsJson?: FieldOption[] | null;
  sortOrder?: number;
  enabled?: boolean;
  validationJson?: FieldValidation | null;
}

export interface ListFieldConfigsParams {
  enabled?: boolean;
}

export async function listFieldConfigs(
  params: ListFieldConfigsParams = {},
): Promise<FieldConfigItem[]> {
  const { data: res } = await apiClient.get<ApiResponse<FieldConfigItem[]>>(
    '/admin/material-fields',
    { params },
  );
  return res.data;
}

export async function createFieldConfig(
  input: CreateFieldConfigInput,
): Promise<FieldConfigItem> {
  const { data: res } = await apiClient.post<ApiResponse<FieldConfigItem>>(
    '/admin/material-fields',
    input,
  );
  return res.data;
}

export async function updateFieldConfig(
  id: string,
  input: UpdateFieldConfigInput,
): Promise<FieldConfigItem> {
  const { data: res } = await apiClient.patch<ApiResponse<FieldConfigItem>>(
    `/admin/material-fields/${id}`,
    input,
  );
  return res.data;
}

export async function toggleFieldConfig(id: string): Promise<FieldConfigItem> {
  const { data: res } = await apiClient.patch<ApiResponse<FieldConfigItem>>(
    `/admin/material-fields/${id}/toggle`,
  );
  return res.data;
}

export async function deleteFieldConfig(id: string): Promise<{ id: string }> {
  const { data: res } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/admin/material-fields/${id}`,
  );
  return res.data;
}

// React Query hooks
const QUERY_KEY = ['admin-material-fields'];

export function useFieldConfigs(enabled?: boolean) {
  return useQuery({
    queryKey: [...QUERY_KEY, { enabled }],
    queryFn: () => listFieldConfigs({ enabled }),
  });
}

export function useCreateFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFieldConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFieldConfigInput }) =>
      updateFieldConfig(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleFieldConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFieldConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
