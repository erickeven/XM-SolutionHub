import prisma from '../../lib/prisma';
import type {
  KnowledgeDoc,
  KnowledgeIndexJob,
  KnowledgeStatus,
  SearchTrace,
} from '@prisma/client';
import type {
  CreateKnowledgeInput,
  UpdateKnowledgeInput,
  KnowledgeDocListItem,
} from './knowledge.types';

export async function findAll(
  page: number,
  pageSize: number,
  status?: KnowledgeStatus,
): Promise<{ items: KnowledgeDocListItem[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [rows, total] = await Promise.all([
    prisma.knowledgeDoc.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { id: 'desc' },
      include: { material: { select: { title: true } } },
    }),
    prisma.knowledgeDoc.count({ where }),
  ]);

  const items: KnowledgeDocListItem[] = rows.map((r) => ({
    id: r.id,
    materialId: r.materialId,
    title: r.title,
    sourceType: r.sourceType,
    status: r.status,
    indexVersion: r.indexVersion,
    indexedAt: r.indexedAt,
    errorMessage: r.errorMessage,
    materialTitle: r.material?.title ?? null,
  }));

  return { items, total };
}

export async function findById(id: string): Promise<KnowledgeDoc | null> {
  return prisma.knowledgeDoc.findUnique({ where: { id } });
}

export async function findByIdWithStats(id: string): Promise<{
  doc: KnowledgeDoc;
  latestIndexJob: KnowledgeIndexJob | null;
  chunkCount: number;
  eventCount: number;
  entityCount: number;
} | null> {
  const doc = await prisma.knowledgeDoc.findUnique({ where: { id } });
  if (!doc) return null;

  const [indexJobs, chunkCount, entityCount] = await Promise.all([
    prisma.knowledgeIndexJob.findMany({
      where: { docId: id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.knowledgeChunk.count({ where: { docId: id } }),
    prisma.knowledgeEntity.count(),
  ]);

  // eventCount: count events via chunks belonging to this doc
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { docId: id },
    select: { id: true },
  });
  const chunkIds = chunks.map((c) => c.id);
  const eventCount =
    chunkIds.length > 0
      ? await prisma.knowledgeEvent.count({ where: { chunkId: { in: chunkIds } } })
      : 0;

  return {
    doc,
    latestIndexJob: indexJobs[0] ?? null,
    chunkCount,
    eventCount,
    entityCount,
  };
}

export async function findByMaterialId(materialId: string): Promise<KnowledgeDoc | null> {
  return prisma.knowledgeDoc.findUnique({ where: { materialId } });
}

export async function create(data: CreateKnowledgeInput): Promise<KnowledgeDoc> {
  return prisma.knowledgeDoc.create({
    data: {
      materialId: data.materialId!,
      title: data.title!,
      sourceType: data.sourceType,
      status: 'UPLOADED',
    },
  });
}

export async function update(
  id: string,
  data: UpdateKnowledgeInput,
): Promise<KnowledgeDoc> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
  return prisma.knowledgeDoc.update({ where: { id }, data: updateData as never });
}

export async function remove(id: string): Promise<KnowledgeDoc> {
  return prisma.knowledgeDoc.delete({ where: { id } });
}

export async function findActiveIndexJob(
  docId: string,
  indexVersion: string,
): Promise<KnowledgeIndexJob | null> {
  return prisma.knowledgeIndexJob.findFirst({
    where: {
      docId,
      indexVersion,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
  });
}

export async function findIndexJob(
  docId: string,
  indexVersion: string,
): Promise<KnowledgeIndexJob | null> {
  return prisma.knowledgeIndexJob.findUnique({
    where: { docId_indexVersion: { docId, indexVersion } },
  });
}

export async function createIndexJob(
  docId: string,
  indexVersion: string,
): Promise<KnowledgeIndexJob> {
  return prisma.knowledgeIndexJob.create({
    data: {
      docId,
      indexVersion,
      status: 'PENDING',
    },
  });
}

export async function updateDocStatus(
  docId: string,
  status: KnowledgeStatus,
  extras?: { indexVersion?: string; indexedAt?: Date; errorMessage?: string },
): Promise<KnowledgeDoc> {
  const data: Record<string, unknown> = { status };
  if (extras?.indexVersion !== undefined) data.indexVersion = extras.indexVersion;
  if (extras?.indexedAt !== undefined) data.indexedAt = extras.indexedAt;
  if (extras?.errorMessage !== undefined) data.errorMessage = extras.errorMessage;
  return prisma.knowledgeDoc.update({ where: { id: docId }, data: data as never });
}

export async function getRecentTraces(
  docId: string,
  limit: number,
): Promise<SearchTrace[]> {
  // SearchTrace has no direct docId; match by query containing doc title or steps containing docId
  const doc = await prisma.knowledgeDoc.findUnique({ where: { id: docId } });
  if (!doc) return [];

  // ponytail: simple text match on query; steps JSON match is best-effort
  return prisma.searchTrace.findMany({
    where: {
      OR: [
        { query: { contains: doc.title, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function materialExists(materialId: string): Promise<boolean> {
  const count = await prisma.material.count({ where: { id: materialId } });
  return count > 0;
}