import prisma from '../../lib/prisma';
import type { AuditLog } from '@prisma/client';
import type { AuditLogEntry, AuditQuery } from './audit.types';

export async function create(entry: AuditLogEntry): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      payload: (entry.payload ?? undefined) as never,
    },
  });
}

export async function findMany(
  query: AuditQuery,
): Promise<{ items: AuditLog[]; total: number }> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.actorId) where.actorId = query.actorId;
  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;
  if (query.targetId) where.targetId = query.targetId;
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) (where.createdAt as Record<string, unknown>).gte = query.startDate;
    if (query.endDate) (where.createdAt as Record<string, unknown>).lte = query.endDate;
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}

export async function findAll(query: AuditQuery): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};
  if (query.actorId) where.actorId = query.actorId;
  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;
  if (query.targetId) where.targetId = query.targetId;
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) (where.createdAt as Record<string, unknown>).gte = query.startDate;
    if (query.endDate) (where.createdAt as Record<string, unknown>).lte = query.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}