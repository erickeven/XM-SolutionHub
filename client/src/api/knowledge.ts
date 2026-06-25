import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface KnowledgeDocItem {
  id: string;
  materialId: string | null;
  title: string;
  sourceType: string;
  status: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
  indexVersion: string | null;
  indexedAt: string | null;
  errorMessage: string | null;
  materialTitle: string | null;
  material?: {
    id: string;
    title: string;
  };
  indexJob?: {
    id: string;
    status: string;
  };
}

export interface CreateKnowledgeResponse {
  id: string;
  title: string;
  sourceType: string;
  status: string;
  materialId: string | null;
  material: {
    id: string;
    title: string;
  } | null;
  indexJob: {
    id: string;
    status: string;
  };
}

export interface KnowledgeListResponse {
  items: KnowledgeDocItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeLatestIndexJob {
  id: string;
  status: string;
  indexVersion: string;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface KnowledgeDetail {
  id: string;
  materialId: string;
  title: string;
  sourceType: string;
  status: string;
  indexVersion: string | null;
  indexedAt: string | null;
  errorMessage: string | null;
  materialTitle: string | null;
  latestIndexJob: KnowledgeLatestIndexJob | null;
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

export interface ReindexResponse {
  jobId: string;
  status: string;
  indexVersion: string;
}

export interface KnowledgeTrace {
  doc: KnowledgeDocItem;
  latestIndexJob: KnowledgeLatestIndexJob | null;
  recentTraces: Array<{
    id: string;
    action: string;
    status: string;
    createdAt: string;
    detail: string | null;
  }>;
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

export async function listKnowledge(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<KnowledgeListResponse> {
  const { data: res } = await apiClient.get<ApiResponse<KnowledgeListResponse>>(
    '/admin/knowledge',
    { params },
  );
  return res.data;
}

export async function getKnowledgeById(id: string): Promise<KnowledgeDetail> {
  const { data: res } = await apiClient.get<ApiResponse<KnowledgeDetail>>(
    `/admin/knowledge/${id}`,
  );
  return res.data;
}

export interface CreateKnowledgeJsonParams {
  materialId: string;
  title?: string;
  sourceType: string;
}

export interface CreateKnowledgeFormDataParams {
  file: File;
  title: string;
  sourceType: string;
}

export async function createKnowledge(
  data: CreateKnowledgeJsonParams | FormData,
): Promise<CreateKnowledgeResponse> {
  const isFormData = data instanceof FormData;
  const config = isFormData
    ? { headers: { 'Content-Type': undefined as unknown as string } }
    : undefined;
  const { data: res } = await apiClient.post<ApiResponse<CreateKnowledgeResponse>>(
    '/admin/knowledge',
    data,
    config,
  );
  return res.data;
}

export function createKnowledgeFormData(params: CreateKnowledgeFormDataParams): FormData {
  const form = new FormData();
  form.append('file', params.file);
  form.append('title', params.title);
  form.append('sourceType', params.sourceType);
  return form;
}

export async function updateKnowledge(
  id: string,
  data: { title?: string; sourceType?: string },
): Promise<KnowledgeDocItem> {
  const { data: res } = await apiClient.patch<ApiResponse<KnowledgeDocItem>>(
    `/admin/knowledge/${id}`,
    data,
  );
  return res.data;
}

export async function deleteKnowledge(id: string): Promise<void> {
  await apiClient.delete(`/admin/knowledge/${id}`);
}

export async function reindexKnowledge(id: string): Promise<ReindexResponse> {
  const { data: res } = await apiClient.post<ApiResponse<ReindexResponse>>(
    `/admin/knowledge/${id}/reindex`,
  );
  return res.data;
}

export async function getKnowledgeTrace(id: string): Promise<KnowledgeTrace> {
  const { data: res } = await apiClient.get<ApiResponse<KnowledgeTrace>>(
    `/admin/knowledge/${id}/trace`,
  );
  return res.data;
}