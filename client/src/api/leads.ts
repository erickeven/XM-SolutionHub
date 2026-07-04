import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'FOLLOWING'
  | 'CONVERTED'
  | 'ABANDONED';

export interface LeadEvent {
  id: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
}

export interface LeadItem {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  email: string | null;
  score: number;
  status: LeadStatus;
  assignedTo: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
  events?: LeadEvent[];
}

export interface LeadListResponse {
  items: LeadItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListLeadsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  assignedTo?: string;
  scoreMin?: number;
  scoreMax?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function listLeads(
  params: ListLeadsParams,
): Promise<LeadListResponse> {
  const { data: res } = await apiClient.get<ApiResponse<LeadListResponse>>(
    '/admin/leads',
    { params },
  );
  return res.data;
}

export async function getLead(
  id: string,
): Promise<LeadItem & { events?: LeadEvent[] }> {
  const { data: res } = await apiClient.get<
    ApiResponse<LeadItem & { events?: LeadEvent[] }>
  >(`/admin/leads/${id}`);
  return res.data;
}

export async function assignLead(
  leadId: string,
  staffId: string,
): Promise<LeadItem> {
  const { data: res } = await apiClient.post<ApiResponse<LeadItem>>(
    `/admin/leads/${leadId}/assign`,
    { staffId },
  );
  return res.data;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<LeadItem> {
  const { data: res } = await apiClient.patch<ApiResponse<LeadItem>>(
    `/admin/leads/${leadId}/status`,
    { status },
  );
  return res.data;
}

export async function exportLeads(
  params: ListLeadsParams,
): Promise<Blob> {
  const res = await apiClient.post('/admin/leads/export', params, {
    responseType: 'blob',
  });
  return res.data as Blob;
}