import { env } from '../../config';
import { AppError } from '../../lib/errors';
import redis from '../../lib/redis';
import prisma from '../../lib/prisma';
import { getStorageAdapter } from '../../lib/storage';
import { getPdfPageCount, extractFirstNPages } from '../../lib/pdf/derive';
import { logFromContext } from '../audit/audit.service';
import * as repository from './knowledge.repository';
import { searchKnowledgeWithDegradation } from './knowledge.search';
import type {
  KnowledgeDocListItem,
  KnowledgeDocDetail,
  CreateKnowledgeInput,
  CreateKnowledgeResponse,
  UpdateKnowledgeInput,
  ReindexResponse,
  TraceResponse,
  KnowledgePaginatedResult,
} from './knowledge.types';
import type { KnowledgeStatus } from '@prisma/client';
import type { SearchOutput } from './knowledge.search.types';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

function nextVersion(current: string | null): string {
  if (!current) return env.KNOWLEDGE_INDEX_VERSION;
  const match = current.match(/^v(\d+)$/);
  if (match && match[1] !== undefined) {
    return `v${parseInt(match[1], 10) + 1}`;
  }
  return `${current}_2`;
}

export async function listDocs(
  page: number,
  pageSize: number,
  status?: KnowledgeStatus,
): Promise<KnowledgePaginatedResult> {
  const { items, total } = await repository.findAll(page, pageSize, status);
  return { items, total, page, pageSize };
}

export async function getDoc(id: string): Promise<KnowledgeDocDetail> {
  const result = await repository.findByIdWithStats(id);
  if (!result) {
    throw new AppError(4001, 'Knowledge doc not found', 404);
  }
  return {
    id: result.doc.id,
    materialId: result.doc.materialId,
    title: result.doc.title,
    sourceType: result.doc.sourceType,
    status: result.doc.status,
    indexVersion: result.doc.indexVersion,
    indexedAt: result.doc.indexedAt,
    errorMessage: result.doc.errorMessage,
    materialTitle: null,
    latestIndexJob: result.latestIndexJob,
    chunkCount: result.chunkCount,
    eventCount: result.eventCount,
    entityCount: result.entityCount,
  };
}

export async function createDoc(
  data: CreateKnowledgeInput,
  actorId: string | null,
): Promise<CreateKnowledgeResponse> {
  const isFileUpload = data.fileBuffer && data.originalName && data.mimeType;

  // Validate: must have materialId OR file upload
  if (!data.materialId && !isFileUpload) {
    throw new AppError(1004, 'Either materialId or file upload is required', 400);
  }

  let materialId: string;
  let materialTitle: string;
  let materialRecord: { id: string; title: string };

  if (isFileUpload) {
    // ── Path B: file upload → auto-create Material ──────
    const ext = path.extname(data.originalName!) || '.bin';
    const storageKey = `${randomUUID()}${ext}`;
    const adapter = getStorageAdapter();
    const uploadedKeys: string[] = [];
    let previewStorageKey: string | undefined;
    let pageCount: number | undefined;

    try {
      // Upload original file
      await adapter.putObject({
        storageKey,
        body: data.fileBuffer!,
        contentType: data.mimeType!,
      });
      uploadedKeys.push(storageKey);

      // Generate PDF preview if applicable
      if (data.mimeType === 'application/pdf') {
        pageCount = await getPdfPageCount(data.fileBuffer!);
        previewStorageKey = `previews/${storageKey}`;
        const previewBuffer = await extractFirstNPages(data.fileBuffer!, 3);
        await adapter.putObject({
          storageKey: previewStorageKey,
          body: previewBuffer,
          contentType: 'application/pdf',
        });
        uploadedKeys.push(previewStorageKey);
      }

      // Create Material record
      const resolvedTitle = data.title || data.originalName!.replace(/\.[^/.]+$/, '');
      const mimeType = data.mimeType!;
      const material = await prisma.material.create({
        data: {
          type: 'other',
          title: resolvedTitle,
          originalStorageKey: storageKey,
          previewStorageKey: previewStorageKey ?? null,
          mimeType,
          pageCount: pageCount ?? null,
          status: 'DRAFT',
        },
      });
      materialId = material.id;
      materialTitle = material.title;
      materialRecord = { id: material.id, title: material.title };

    } catch (error) {
      // Rollback uploaded files on failure
      await Promise.allSettled(uploadedKeys.map((key) =>
        getStorageAdapter().removeObject(key),
      ));
      throw error;
    }
  } else {
    // ── Path A: existing materialId ────────────────────
    const existing = await prisma.material.findUnique({
      where: { id: data.materialId! },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new AppError(4002, 'Referenced material does not exist', 404);
    }

    // Check no existing KnowledgeDoc for this material
    const docForMaterial = await repository.findByMaterialId(data.materialId!);
    if (docForMaterial) {
      throw new AppError(4003, 'Knowledge doc for this material already exists', 409);
    }

    materialId = existing.id;
    materialTitle = existing.title;
    materialRecord = { id: existing.id, title: existing.title };
  }

  // ── Create KnowledgeDoc ─────────────────────────────
  const resolvedTitle = data.title || materialTitle;
  const doc = await repository.create({
    materialId,
    title: resolvedTitle,
    sourceType: data.sourceType,
  });

  // ── Create KnowledgeIndexJob (PENDING) ──────────────
  const version = env.KNOWLEDGE_INDEX_VERSION;
  const job = await repository.createIndexJob(doc.id, version);
  // Push to Redis Stream for worker
  await redis.xadd('knowledge:index', '*', 'jobId', job.id);

  logFromContext({
    actorId,
    action: 'knowledge.create',
    targetType: 'KnowledgeDoc',
    targetId: doc.id,
    payload: {
      materialId,
      title: resolvedTitle,
      sourceType: data.sourceType,
      creationPath: isFileUpload ? 'upload' : 'existing',
    },
  });

  return {
    id: doc.id,
    title: resolvedTitle,
    sourceType: doc.sourceType,
    status: doc.status,
    materialId,
    material: materialRecord,
    indexJob: { id: job.id, status: job.status },
  };
}

export async function updateDoc(
  id: string,
  data: UpdateKnowledgeInput,
  actorId: string | null,
): Promise<KnowledgeDocListItem> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'Knowledge doc not found', 404);
  }

  const doc = await repository.update(id, data);

  logFromContext({
    actorId,
    action: 'knowledge.update',
    targetType: 'KnowledgeDoc',
    targetId: id,
    payload: data as Record<string, unknown>,
  });

  return {
    id: doc.id,
    materialId: doc.materialId,
    title: doc.title,
    sourceType: doc.sourceType,
    status: doc.status,
    indexVersion: doc.indexVersion,
    indexedAt: doc.indexedAt,
    errorMessage: doc.errorMessage,
    materialTitle: null,
  };
}

export async function deleteDoc(
  id: string,
  actorId: string | null,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'Knowledge doc not found', 404);
  }

  await repository.remove(id);

  logFromContext({
    actorId,
    action: 'knowledge.delete',
    targetType: 'KnowledgeDoc',
    targetId: id,
  });
}

export async function reindex(
  docId: string,
  actorId: string | null,
): Promise<ReindexResponse> {
  const doc = await repository.findById(docId);
  if (!doc) {
    throw new AppError(4001, 'Knowledge doc not found', 404);
  }

  // Determine next version
  let version = nextVersion(doc.indexVersion);

  // Check if a job already exists for this version
  let existingJob = await repository.findIndexJob(docId, version);

  // If job exists and is active (PENDING/PROCESSING), return it — idempotent
  if (existingJob && (existingJob.status === 'PENDING' || existingJob.status === 'PROCESSING')) {
    return {
      jobId: existingJob.id,
      status: existingJob.status,
      indexVersion: existingJob.indexVersion,
    };
  }

  // If job exists and SUCCEEDED or FAILED, increment version and try to create new
  if (existingJob && (existingJob.status === 'SUCCEEDED' || existingJob.status === 'FAILED')) {
    version = nextVersion(version);
    // Check again at the new version
    existingJob = await repository.findIndexJob(docId, version);
    if (existingJob && (existingJob.status === 'PENDING' || existingJob.status === 'PROCESSING')) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
        indexVersion: existingJob.indexVersion,
      };
    }
  }

  // Create new job
  const job = await repository.createIndexJob(docId, version);

  // Update doc status to PROCESSING
  await repository.updateDocStatus(docId, 'PROCESSING', { indexVersion: version });

  // Push job to Redis Stream
  await redis.xadd('knowledge:index', '*', 'jobId', job.id);

  logFromContext({
    actorId,
    action: 'knowledge.reindex',
    targetType: 'KnowledgeDoc',
    targetId: docId,
    payload: { jobId: job.id, indexVersion: version },
  });

  return {
    jobId: job.id,
    status: job.status,
    indexVersion: version,
  };
}

export async function getTrace(docId: string): Promise<TraceResponse> {
  const result = await repository.findByIdWithStats(docId);
  if (!result) {
    throw new AppError(4001, 'Knowledge doc not found', 404);
  }

  const recentTraces = await repository.getRecentTraces(docId, 10);

  return {
    doc: result.doc,
    latestIndexJob: result.latestIndexJob,
    recentTraces,
    chunkCount: result.chunkCount,
    eventCount: result.eventCount,
    entityCount: result.entityCount,
  };
}

export async function searchKnowledge(
  query: string,
  options: {
    mode?: 'fast' | 'standard';
    topK?: number;
    returnTrace?: boolean;
    userRole?: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN' | null;
    userId?: string | null;
  } = {},
): Promise<SearchOutput> {
  const mode = options.mode ?? env.KNOWLEDGE_SEARCH_MODE;
  const topK = options.topK ?? 30;
  const userRole = options.userRole ?? 'USER';

  const result = await searchKnowledgeWithDegradation(query, mode, topK, userRole);

  // If returnTrace is false, strip the trace from output
  if (!options.returnTrace) {
    return { sources: result.sources, trace: [], latencyMs: result.latencyMs };
  }

  return result;
}