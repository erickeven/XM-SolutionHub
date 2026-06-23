import { logger } from '../../lib/logger';
import * as repository from './audit.repository';
import type { AuditLogEntry, AuditQuery, AuditPaginatedResult, AuditLogRow } from './audit.types';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'refreshtoken'];

export function sanitizePayload(payload: unknown): Record<string, unknown> | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload !== 'object' || Array.isArray(payload)) return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue;
    result[key] = value;
  }
  return result;
}

export async function log(entry: AuditLogEntry): Promise<void> {
  try {
    await repository.create(entry);
  } catch (err) {
    // Audit logging must never break the main operation
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'Failed to write audit log',
    );
  }
}

export async function query(query: AuditQuery): Promise<AuditPaginatedResult> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const { items, total } = await repository.findMany(query);

  return {
    items: items.map((item): AuditLogRow => ({
      id: item.id,
      actorId: item.actorId,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      payload: sanitizePayload(item.payload),
      createdAt: item.createdAt,
    })),
    total,
    page,
    limit,
  };
}

export function logFromContext(params: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, unknown>;
}): void {
  void log({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId ?? null,
    payload: params.payload,
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatAuditLogsAsCsv(
  items: Array<{
    id: string;
    actorId: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    payload: unknown;
    createdAt: Date;
  }>,
): string {
  const header = 'id,actorId,action,targetType,targetId,createdAt,payload';
  const rows = items.map((item) => {
    const sanitized = sanitizePayload(item.payload);
    const payloadStr = sanitized === null ? '' : JSON.stringify(sanitized);
    return [
      csvEscape(item.id),
      csvEscape(item.actorId ?? ''),
      csvEscape(item.action),
      csvEscape(item.targetType),
      csvEscape(item.targetId ?? ''),
      csvEscape(item.createdAt.toISOString()),
      csvEscape(payloadStr),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export async function exportAuditLogs(query: AuditQuery): Promise<string> {
  const items = await repository.findAll(query);
  return formatAuditLogsAsCsv(items);
}