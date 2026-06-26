import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface AiProviderItem {
  id: string;
  providerType: string;
  name: string;
  baseUrl: string | null;
  apiKeyMasked: string | null;
  model: string | null;
  dimensions: number | null;
  enabled: boolean;
  isDefault: boolean;
}

export interface AiPromptItem {
  id: string;
  key: string;
  title: string;
  content: string;
  enabled: boolean;
  version: number;
}

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string | null;
  apiKeyEncrypted?: string | null;
  model?: string | null;
  dimensions?: number | null;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface UpdatePromptInput {
  title?: string;
  content?: string;
  enabled?: boolean;
}

export interface TestConnectionInput {
  providerType: 'llm' | 'embedding' | 'rerank';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export async function listProviders(): Promise<AiProviderItem[]> {
  const { data: res } = await apiClient.get<ApiResponse<{ items: AiProviderItem[] }>>(
    '/admin/ai-settings',
  );
  return res.data.items;
}

export async function getProvider(id: string): Promise<AiProviderItem> {
  const { data: res } = await apiClient.get<ApiResponse<AiProviderItem>>(
    `/admin/ai-settings/${id}`,
  );
  return res.data;
}

export async function updateProvider(id: string, input: UpdateProviderInput): Promise<AiProviderItem> {
  const { data: res } = await apiClient.patch<ApiResponse<AiProviderItem>>(
    `/admin/ai-settings/${id}`,
    input,
  );
  return res.data;
}

export async function testConnection(input: TestConnectionInput): Promise<{ success: boolean; latencyMs: number }> {
  const { data: res } = await apiClient.post<
    ApiResponse<{ success: boolean; latencyMs: number }>
  >('/admin/ai-settings/test', input);
  return res.data;
}

export async function listPrompts(): Promise<AiPromptItem[]> {
  const { data: res } = await apiClient.get<ApiResponse<{ items: AiPromptItem[] }>>(
    '/admin/ai-prompts',
  );
  return res.data.items;
}

export async function getPrompt(id: string): Promise<AiPromptItem> {
  const { data: res } = await apiClient.get<ApiResponse<AiPromptItem>>(
    `/admin/ai-prompts/${id}`,
  );
  return res.data;
}

export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<AiPromptItem> {
  const { data: res } = await apiClient.patch<ApiResponse<AiPromptItem>>(
    `/admin/ai-prompts/${id}`,
    input,
  );
  return res.data;
}

// React Query hooks
const PROVIDERS_QUERY_KEY = ['admin-ai-settings'];
const PROMPTS_QUERY_KEY = ['admin-ai-prompts'];

export function useProviders() {
  return useQuery({
    queryKey: PROVIDERS_QUERY_KEY,
    queryFn: listProviders,
  });
}

export function usePrompts() {
  return useQuery({
    queryKey: PROMPTS_QUERY_KEY,
    queryFn: listPrompts,
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProviderInput }) =>
      updateProvider(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePromptInput }) =>
      updatePrompt(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: testConnection,
  });
}