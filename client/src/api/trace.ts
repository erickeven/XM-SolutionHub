import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface SearchTraceStep {
  stage: 'entity' | 'fulltext' | 'vector' | 'expand' | 'rerank';
  durationMs: number;
  candidateCount: number;
  selectedIds: string[];
}

export interface SearchTraceRecord {
  id: string;
  userId: string | null;
  query: string;
  mode: string;
  latencyMs: number;
  steps: SearchTraceStep[] | null;
  createdAt: string;
}

export interface TraceDoc {
  id: string;
  title: string;
  status: string;
  indexVersion: string | null;
  errorMessage: string | null;
}

export interface TraceIndexJob {
  id: string;
  status: string;
  indexVersion: string;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TraceResponse {
  doc: TraceDoc;
  latestIndexJob: TraceIndexJob | null;
  recentTraces: SearchTraceRecord[];
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

export async function getTrace(docId: string): Promise<TraceResponse> {
  const { data: res } = await apiClient.get<ApiResponse<TraceResponse>>(
    `/admin/knowledge/${docId}/trace`,
  );
  return res.data;
}