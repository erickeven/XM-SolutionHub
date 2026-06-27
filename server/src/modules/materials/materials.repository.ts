import { randomUUID } from 'node:crypto';
import path from 'node:path';
import prisma from '../../lib/prisma';
import type { Material } from '@prisma/client';
import type {
  CreateMaterialInput,
  MaterialQuery,
} from './materials.types';

export async function findMany(
  query: MaterialQuery,
): Promise<{ items: Material[]; total: number }> {
  const { page, limit, search, status, type, solutionId, productId } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (solutionId) where.solutionId = solutionId;
  if (productId) where.productId = productId;
  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        solution: { select: { name: true } },
        product: { select: { model: true, series: true } },
      },
    }),
    prisma.material.count({ where }),
  ]);

  return { items, total };
}

export async function findById(id: string): Promise<Material | null> {
  return prisma.material.findUnique({ where: { id } });
}

export async function findActiveById(id: string): Promise<Material | null> {
  return prisma.material.findFirst({ where: { id, status: 'ACTIVE' } });
}

export async function createLeadEvent(data: {
  leadId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await prisma.leadEvent.create({
    data: {
      leadId: data.leadId,
      eventType: data.eventType,
      payload: data.payload as never,
    },
  });
}

export async function findLeadByUserId(
  userId: string,
): Promise<{ id: string } | null> {
  return prisma.lead.findFirst({ where: { userId }, select: { id: true } });
}

export async function findByStorageKey(
  storageKey: string,
): Promise<Material | null> {
  return prisma.material.findFirst({
    where: { originalStorageKey: storageKey },
  });
}

export function generateStorageKey(
  originalName: string,
  mimeType: string,
): string {
  const ext = path.extname(originalName) || mimeToExt(mimeType);
  return `${randomUUID()}${ext}`;
}

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  return map[mimeType] ?? '';
}

export async function create(
  data: CreateMaterialInput & {
    originalStorageKey: string;
    mimeType: string;
    previewStorageKey?: string;
    pageCount?: number;
  },
): Promise<Material> {
  return prisma.material.create({
    data: {
      type: data.type,
      title: data.title,
      solutionId: data.solutionId ?? null,
      productId: data.productId ?? null,
      originalStorageKey: data.originalStorageKey,
      previewStorageKey: data.previewStorageKey ?? null,
      mimeType: data.mimeType,
      pageCount: data.pageCount ?? null,
      metadata: (data.metadata ?? undefined) as never,
      status: 'DRAFT',
    },
  });
}

export async function update(
  id: string,
  data: {
    title?: string;
    type?: string;
    solutionId?: string | null;
    productId?: string | null;
    status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    pageCount?: number;
    previewStorageKey?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Material> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.solutionId !== undefined) updateData.solutionId = data.solutionId ?? null;
  if (data.productId !== undefined) updateData.productId = data.productId ?? null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.pageCount !== undefined) updateData.pageCount = data.pageCount;
  if (data.previewStorageKey !== undefined)
    updateData.previewStorageKey = data.previewStorageKey;
  if (data.metadata !== undefined)
    updateData.metadata = data.metadata as never;

  return prisma.material.update({ where: { id }, data: updateData as never });
}

export async function softDelete(id: string): Promise<Material> {
  return prisma.material.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}
