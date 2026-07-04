export interface AuditLogEntry {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payload?: Record<string, unknown>;
}

export interface AuditQuery {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditPaginatedResult {
  items: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  createdAt: Date;
  actorLabel?: string;
  actionLabel: string;
  targetLabel?: string;
  targetShortId?: string;
}