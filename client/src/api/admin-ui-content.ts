import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface UiContentItem {
  id: string;
  key: string;
  group: string;
  label: string;
  value: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUiContentInput {
  key: string;
  group: string;
  label: string;
  value: string;
  enabled?: boolean;
}

export interface UpdateUiContentInput {
  group?: string;
  label?: string;
  value?: string;
  enabled?: boolean;
}

const QUERY_KEY = ['admin-ui-content'];

export async function listUiContent(): Promise<UiContentItem[]> {
  const { data: res } = await apiClient.get<ApiResponse<UiContentItem[]>>('/admin/ui-content');
  return res.data;
}

export async function createUiContent(input: CreateUiContentInput): Promise<UiContentItem> {
  const { data: res } = await apiClient.post<ApiResponse<UiContentItem>>('/admin/ui-content', input);
  return res.data;
}

export async function updateUiContent(
  id: string,
  input: UpdateUiContentInput,
): Promise<UiContentItem> {
  const { data: res } = await apiClient.patch<ApiResponse<UiContentItem>>(
    `/admin/ui-content/${id}`,
    input,
  );
  return res.data;
}

export function useUiContentItems() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: listUiContent,
  });
}

export function useCreateUiContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUiContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['ui-content'] });
    },
  });
}

export function useUpdateUiContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUiContentInput }) =>
      updateUiContent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['ui-content'] });
    },
  });
}
