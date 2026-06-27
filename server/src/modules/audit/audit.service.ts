import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import * as repository from './audit.repository';
import type { AuditLogEntry, AuditQuery, AuditPaginatedResult, AuditLogRow } from './audit.types';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'refreshtoken'];

const ACTION_LABELS: Record<string, string> = {
  'user.login': '用户登录',
  'user.logout': '用户登出',
  'user.register': '用户注册',
  'product.create': '创建产品',
  'product.update': '更新产品',
  'product.delete': '删除产品',
  'product.hardDelete': '永久删除产品',
  'solution.create': '创建方案',
  'solution.update': '更新方案',
  'solution.delete': '删除方案',
  'solution.hardDelete': '永久删除方案',
  'material.create': '创建资料',
  'material.update': '更新资料',
  'material.delete': '删除资料',
  'material.hardDelete': '永久删除资料',
  'knowledge.doc.upload': '上传知识库文档',
  'knowledge.doc.delete': '删除知识库文档',
};

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

  const enriched = await enrichLabels(items);

  return {
    items: enriched.map((item): AuditLogRow => ({
      id: item.id,
      actorId: item.actorId,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      payload: sanitizePayload(item.payload),
      createdAt: item.createdAt,
      actorLabel: item.actorLabel,
      actionLabel: item.actionLabel,
      targetLabel: item.targetLabel,
      targetShortId: item.targetShortId,
    })),
    total,
    page,
    limit,
  };
}

async function enrichLabels<T extends { actorId: string | null; action: string; targetType: string; targetId: string | null; payload: unknown; createdAt: Date }>(
  items: T[],
): Promise<
  Array<T & { actorLabel?: string; actionLabel: string; targetLabel?: string; targetShortId?: string }>
> {
  // actor labels
  const uniqueActorIds = [...new Set(items.map((i) => i.actorId).filter((id): id is string => id !== null))];
  const actorMap = new Map<string, string>();
  if (uniqueActorIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueActorIds } },
      select: { id: true, email: true },
    });
    for (const u of users) actorMap.set(u.id, u.email);
  }

  // target labels, grouped by targetType
  const targetTypes = [...new Set(items.map((i) => i.targetType))];
  const targetMaps = new Map<string, Map<string, string>>();

  for (const tt of targetTypes) {
    const ids = items.filter((i) => i.targetType === tt && i.targetId !== null).map((i) => i.targetId as string);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) continue;

    let labelMap = new Map<string, string>();

    if (tt === 'Product') {
      const recs = await prisma.product.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, model: true } });
      for (const r of recs) labelMap.set(r.id, r.model);
    } else if (tt === 'Solution') {
      const recs = await prisma.solution.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true } });
      for (const r of recs) labelMap.set(r.id, r.name);
    } else if (tt === 'Material') {
      const recs = await prisma.material.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, title: true } });
      for (const r of recs) labelMap.set(r.id, r.title);
    } else if (tt === 'User') {
      const recs = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, email: true } });
      for (const r of recs) labelMap.set(r.id, r.email);
    } else if (tt === 'KnowledgeDoc' || tt === 'KnowledgeDocument') {
      const recs = await prisma.knowledgeDoc.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, title: true } });
      for (const r of recs) labelMap.set(r.id, r.title);
    } else {
      labelMap = new Map(uniqueIds.map((id) => [id, id]));
    }

    targetMaps.set(tt, labelMap);
  }

  return items.map((item) => {
    const actionLabel = ACTION_LABELS[item.action] ?? item.action;
    const actorLabel = item.actorId ? actorMap.get(item.actorId) : undefined;
    const targetMap = item.targetType ? targetMaps.get(item.targetType) : undefined;
    const targetLabel = item.targetId ? targetMap?.get(item.targetId) : undefined;
    const targetShortId = item.targetId ? item.targetId.slice(0, 6) : undefined;

    return { ...item, actionLabel, actorLabel, targetLabel, targetShortId };
  });
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
    actorLabel?: string;
    actionLabel: string;
    targetLabel?: string;
    targetShortId?: string;
  }>,
): string {
  const header = 'id,actorId,actorLabel,action,actionLabel,targetType,targetId,targetLabel,targetShortId,createdAt,payload';
  const rows = items.map((item) => {
    const sanitized = sanitizePayload(item.payload);
    const payloadStr = sanitized === null ? '' : JSON.stringify(sanitized);
    return [
      csvEscape(item.id),
      csvEscape(item.actorId ?? ''),
      csvEscape(item.actorLabel ?? ''),
      csvEscape(item.action),
      csvEscape(item.actionLabel),
      csvEscape(item.targetType),
      csvEscape(item.targetId ?? ''),
      csvEscape(item.targetLabel ?? ''),
      csvEscape(item.targetShortId ?? ''),
      csvEscape(item.createdAt.toISOString()),
      csvEscape(payloadStr),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export async function exportAuditLogs(query: AuditQuery): Promise<string> {
  const items = await repository.findAll(query);
  const enriched = await enrichLabels(items);
  return formatAuditLogsAsCsv(enriched);
}