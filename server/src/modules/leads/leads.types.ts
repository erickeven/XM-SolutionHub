export type EventType =
  | 'selection'
  | 'product_view'
  | 'material_preview'
  | 'material_download'
  | 'ai_question'
  | 'ai_feedback'
  | 'register';

export interface EventInput {
  eventType: EventType;
  anonymousId?: string;
  page?: string;
  payload?: Record<string, unknown>;
}

export interface EventPayload {
  eventType: string;
  anonymousId?: string;
  page?: string;
  payload?: Record<string, unknown>;
}

export interface LeadItem {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  score: number;
  status: string;
  assignedTo: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadListItem {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  score: number;
  status: string;
  assignedTo: string | null;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface ProcessEventResult {
  leadId: string;
  eventId: string;
}

// ── Lead aggregation types (PRD §7.5) ──────────────────────

export type LeadStatus = 'NEW' | 'ASSIGNED' | 'FOLLOWING' | 'CONVERTED' | 'ABANDONED';

export interface LeadEventSummary {
  id: string;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}

export interface LeadAggregated {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  score: number;
  status: LeadStatus;
  assignedTo: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  events: LeadEventSummary[];
}

export interface LeadListQuery {
  page: number;
  pageSize: number;
  status?: LeadStatus;
  assignedTo?: string;
  scoreMin?: number;
  scoreMax?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface LeadListResult {
  items: LeadAggregated[];
  total: number;
  page: number;
  pageSize: number;
}