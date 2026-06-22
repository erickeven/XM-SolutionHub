import { logger } from '../../lib/logger';
import * as repository from './audit.repository';
import type { AuditLogEntry, AuditQuery, AuditPaginatedResult } from './audit.types';

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
    items: items.map((item) => ({
      id: item.id,
      actorId: item.actorId,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      payload: item.payload,
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