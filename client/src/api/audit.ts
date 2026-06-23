import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface AuditLogResult {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogParams {
  actorId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(
  params: AuditLogParams,
): Promise<AuditLogResult> {
  const { data: res } = await apiClient.get<ApiResponse<AuditLogResult>>(
    '/admin/audit',
    { params },
  );
  return res.data;
}

export async function exportAuditLogs(
  params: AuditLogParams,
): Promise<Blob> {
  const res = await apiClient.post('/admin/audit/export', params, {
    responseType: 'blob',
  });
  return res.data as Blob;
}
