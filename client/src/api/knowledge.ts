import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface KnowledgeDocItem {
  id: string;
  materialId: string;
  title: string;
  sourceType: string;
  status: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
  indexVersion: string | null;
  indexedAt: string | null;
  errorMessage: string | null;
  materialTitle: string | null;
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

export async function createKnowledge(data: {
  materialId: string;
  title: string;
  sourceType: string;
}): Promise<KnowledgeDocItem> {
  const { data: res } = await apiClient.post<ApiResponse<KnowledgeDocItem>>(
    '/admin/knowledge',
    data,
  );
  return res.data;
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