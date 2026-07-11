import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { AppError } from '../../lib/errors';
import { getStorageAdapter } from '../../lib/storage';
import { createZipArchive } from '../../lib/archive/zip';
import { addWatermark } from '../../lib/pdf/watermark';
import {
  extractFirstNPages,
  getPdfPageCount,
} from '../../lib/pdf/derive';
import {
  createOfficeTextPreview,
  getLimitedOfficePreviewStorageKey,
  isOfficeMime,
} from '../../lib/office/preview';
import { logFromContext } from '../audit/audit.service';
import type { AuthUser } from '../../middleware/auth';
import prisma from '../../lib/prisma';
import * as repository from './materials.repository';
import * as fieldConfigRepository from './field-config.repository';
import type {
  CreateMaterialInput,
  MaterialQuery,
  MaterialPaginatedResult,
  MaterialDetail,
  UpdateMaterialInput,
} from './materials.types';

const SIGNED_URL_EXPIRES = 1800;
const refreshedOfficePreviewIds = new Set<string>();
const MATERIAL_CORE_FIELDS = new Set([
  'file',
  'title',
  'type',
  'status',
  'solutionId',
  'productId',
]);

function isEmptyMetadataValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function readValidation(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

async function validateMaterialMetadata(metadata: Record<string, unknown>): Promise<void> {
  const fields = (await fieldConfigRepository.findAll(true)).filter(
    (field) => !MATERIAL_CORE_FIELDS.has(field.fieldKey),
  );
  const configuredKeys = new Set(fields.map((field) => field.fieldKey));
  for (const key of Object.keys(metadata)) {
    if (!configuredKeys.has(key)) {
      throw new AppError(1002, `Unknown material field: ${key}`, 400);
    }
  }

  for (const field of fields) {
    const value = metadata[field.fieldKey];
    if (isEmptyMetadataValue(value)) {
      if (field.required) {
        throw new AppError(1002, `${field.label} is required`, 400);
      }
      continue;
    }

    const options = Array.isArray(field.optionsJson)
      ? field.optionsJson
          .map((option) =>
            typeof option === 'string'
              ? option
              : typeof option === 'object' && option !== null && 'value' in option
                ? String(option.value)
                : null,
          )
          .filter((option): option is string => option !== null)
      : [];
    const valid = (() => {
      switch (field.fieldType) {
        case 'text':
          return typeof value === 'string';
        case 'number':
          return typeof value === 'number' && Number.isFinite(value);
        case 'boolean':
          return typeof value === 'boolean';
        case 'single_select':
          return typeof value === 'string' && options.includes(value);
        case 'multi_select':
          return (
            Array.isArray(value) &&
            value.every((item) => typeof item === 'string' && options.includes(item))
          );
        default:
          return false;
      }
    })();

    if (!valid) {
      throw new AppError(1002, `${field.label} has an invalid value`, 400);
    }

    const validation = readValidation(field.validationJson);
    if (typeof value === 'number') {
      if (typeof validation.min === 'number' && value < validation.min) {
        throw new AppError(1002, `${field.label} must be at least ${validation.min}`, 400);
      }
      if (typeof validation.max === 'number' && value > validation.max) {
        throw new AppError(1002, `${field.label} must be at most ${validation.max}`, 400);
      }
    }
    if (typeof value === 'string') {
      if (typeof validation.minLength === 'number' && value.length < validation.minLength) {
        throw new AppError(1002, `${field.label} is too short`, 400);
      }
      if (typeof validation.maxLength === 'number' && value.length > validation.maxLength) {
        throw new AppError(1002, `${field.label} is too long`, 400);
      }
      if (typeof validation.pattern === 'string' && validation.pattern) {
        try {
          if (!new RegExp(validation.pattern).test(value)) {
            throw new AppError(1002, `${field.label} has an invalid format`, 400);
          }
        } catch (error) {
          if (error instanceof AppError) throw error;
        }
      }
    }
  }
}

function sanitizeArchivePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'material';
}

function inferExtension(material: { originalStorageKey: string; mimeType: string }): string {
  const ext = path.extname(material.originalStorageKey);
  if (ext) return ext;
  if (material.mimeType === 'application/pdf') return '.pdf';
  if (material.mimeType === 'application/msword') return '.doc';
  if (material.mimeType.includes('wordprocessingml.document')) return '.docx';
  if (material.mimeType === 'application/vnd.ms-excel') return '.xls';
  if (material.mimeType.includes('spreadsheetml.sheet')) return '.xlsx';
  return '';
}

function buildUniqueFilename(
  material: { title: string; originalStorageKey: string; mimeType: string },
  used: Map<string, number>,
): string {
  const ext = inferExtension(material);
  const safeTitle = sanitizeArchivePart(material.title);
  const base =
    ext && safeTitle.toLowerCase().endsWith(ext.toLowerCase())
      ? safeTitle.slice(0, -ext.length)
      : safeTitle;
  const key = `${base}${ext}`.toLowerCase();
  const count = used.get(key) ?? 0;
  used.set(key, count + 1);
  return count === 0 ? `${base}${ext}` : `${base}-${count + 1}${ext}`;
}

export async function listMaterials(
  query: MaterialQuery,
): Promise<MaterialPaginatedResult> {
  const { items, total } = await repository.findMany(query);
  return {
    items: items.map((m) => ({
      id: m.id,
      solutionId: m.solutionId,
      productId: m.productId,
      type: m.type,
      title: m.title,
      mimeType: m.mimeType,
      pageCount: m.pageCount,
      previewPages: m.previewPages,
      status: m.status,
      metadata: (m as never as { metadata: Record<string, unknown> | null }).metadata ?? null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      solutionName: (m as never as { solution: { name: string } | null }).solution?.name ?? null,
      productModel: (m as never as { product: { model: string; series: string } | null }).product?.model ?? null,
      productSeries: (m as never as { product: { model: string; series: string } | null }).product?.series ?? null,
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getMaterial(id: string): Promise<MaterialDetail> {
  const material = await repository.findById(id);
  if (!material) {
    throw new AppError(3001, 'Material not found', 404);
  }
  return {
    id: material.id,
    solutionId: material.solutionId,
    productId: material.productId,
    type: material.type,
    title: material.title,
    originalStorageKey: material.originalStorageKey,
    previewStorageKey: material.previewStorageKey,
    mimeType: material.mimeType,
    pageCount: material.pageCount,
    previewPages: material.previewPages,
    status: material.status,
    metadata: (material as never as { metadata: Record<string, unknown> | null }).metadata ?? null,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    solutionName: null,
    productModel: null,
    productSeries: null,
  };
}

export async function createMaterial(
  input: CreateMaterialInput & {
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
  },
  actorId: string | null,
): Promise<MaterialDetail> {
  await validateMaterialMetadata(input.metadata ?? {});
  const storageKey = repository.generateStorageKey(
    input.originalName,
    input.mimeType,
  );

  const adapter = getStorageAdapter();
  const uploadedKeys: string[] = [];
  let previewStorageKey: string | undefined;
  let pageCount: number | undefined;

  try {
    await adapter.putObject({
      storageKey,
      body: input.fileBuffer,
      contentType: input.mimeType,
    });
    uploadedKeys.push(storageKey);

    if (input.mimeType === 'application/pdf') {
      pageCount = await getPdfPageCount(input.fileBuffer);
      previewStorageKey = `previews/${storageKey}`;
      const previewBuffer = await extractFirstNPages(input.fileBuffer, 3);
      await adapter.putObject({
        storageKey: previewStorageKey,
        body: previewBuffer,
        contentType: 'application/pdf',
      });
      uploadedKeys.push(previewStorageKey);
    } else if (isOfficeMime(input.mimeType)) {
      previewStorageKey = `previews/${storageKey}.txt`;
      const fullPreviewBuffer = createOfficeTextPreview(
        input.fileBuffer,
        input.mimeType,
        input.originalName,
      );
      await adapter.putObject({
        storageKey: previewStorageKey,
        body: fullPreviewBuffer,
        contentType: 'text/plain; charset=utf-8',
      });
      uploadedKeys.push(previewStorageKey);
      const limitedPreviewStorageKey = getLimitedOfficePreviewStorageKey(previewStorageKey);
      await adapter.putObject({
        storageKey: limitedPreviewStorageKey,
        body: createOfficeTextPreview(
          input.fileBuffer,
          input.mimeType,
          input.originalName,
          true,
        ),
        contentType: 'text/plain; charset=utf-8',
      });
      uploadedKeys.push(limitedPreviewStorageKey);
    }

    const material = await repository.create({
      type: input.type,
      title: input.title,
      solutionId: input.solutionId,
      productId: input.productId,
      metadata: input.metadata,
      originalStorageKey: storageKey,
      previewStorageKey,
      pageCount,
      mimeType: input.mimeType,
    });

    logFromContext({
      actorId,
      action: 'material.create',
      targetType: 'Material',
      targetId: material.id,
      payload: { type: input.type, title: input.title, storageKey },
    });

  return {
    id: material.id,
    solutionId: material.solutionId,
    productId: material.productId,
    type: material.type,
    title: material.title,
    originalStorageKey: material.originalStorageKey,
    previewStorageKey: material.previewStorageKey,
    mimeType: material.mimeType,
    pageCount: material.pageCount,
    previewPages: material.previewPages,
    status: material.status,
    metadata: (material as never as { metadata: Record<string, unknown> | null }).metadata ?? null,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    solutionName: null,
    productModel: null,
    productSeries: null,
  };
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => adapter.removeObject(key)));
    throw error;
  }
}

export async function updateMaterial(
  id: string,
  input: UpdateMaterialInput,
  actorId: string | null,
): Promise<MaterialDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Material not found', 404);
  }

  if (input.metadata !== undefined) {
    await validateMaterialMetadata(input.metadata);
  }

  if (input.productId !== undefined || input.type !== undefined) {
    const primaryProduct = await prisma.product.findFirst({
      where: { datasheetMaterialId: id },
      select: { id: true },
    });
    if (
      primaryProduct &&
      ((input.productId !== undefined && input.productId !== primaryProduct.id) ||
        (input.type !== undefined && input.type !== 'datasheet'))
    ) {
      throw new AppError(3004, 'Primary datasheet association must be changed from product management', 409);
    }
  }

  if (
    input.status === 'ACTIVE' &&
    existing.mimeType === 'application/pdf' &&
    !existing.previewStorageKey
  ) {
    throw new AppError(3003, 'PDF preview is not ready', 409);
  }

  const material = await repository.update(id, input);

  logFromContext({
    actorId,
    action: 'material.update',
    targetType: 'Material',
    targetId: id,
    payload: input as Record<string, unknown>,
  });

  return {
    id: material.id,
    solutionId: material.solutionId,
    productId: material.productId,
    type: material.type,
    title: material.title,
    originalStorageKey: material.originalStorageKey,
    previewStorageKey: material.previewStorageKey,
    mimeType: material.mimeType,
    pageCount: material.pageCount,
    previewPages: material.previewPages,
    status: material.status,
    metadata: (material as never as { metadata: Record<string, unknown> | null }).metadata ?? null,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    solutionName: null,
    productModel: null,
    productSeries: null,
  };
}

export async function hardDeleteMaterial(id: string, actorId?: string): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) throw new AppError(3001, 'Material not found', 404);
  if (existing.status !== 'INACTIVE') {
    throw new AppError(4001, 'Cannot permanently delete active material. Move to recycle bin first.', 400);
  }

  // DB transaction: clean up KnowledgeDoc chain first, then delete Material
  await prisma.$transaction(async (tx) => {
    // 1. Delete KnowledgeDoc (cascades to KnowledgeIndexJob, KnowledgeChunk,
    //    KnowledgeEvent, KnowledgeEventEntity via DB onDelete: Cascade)
    await tx.knowledgeDoc.deleteMany({ where: { materialId: id } });
    // 2. Delete the material
    await tx.material.delete({ where: { id } });
  });

  // MinIO cleanup AFTER successful DB transaction (non-critical)
  try {
    const adapter = getStorageAdapter();
    const keysToDelete: string[] = [];
    if (existing.originalStorageKey) keysToDelete.push(existing.originalStorageKey);
    if (existing.previewStorageKey) keysToDelete.push(existing.previewStorageKey);
    if (existing.previewStorageKey && isOfficeMime(existing.mimeType)) {
      keysToDelete.push(getLimitedOfficePreviewStorageKey(existing.previewStorageKey));
    }
    if (keysToDelete.length > 0) {
      await Promise.allSettled(keysToDelete.map((key) => adapter.removeObject(key)));
    }
  } catch (err) {
    // Storage cleanup is best effort after the database transaction has committed.
    console.error('MinIO cleanup failed for material', id, err);
  }

  if (actorId) {
    logFromContext({ actorId, action: 'material.hardDelete', targetType: 'Material', targetId: id });
  }
}

export async function deleteMaterial(
  id: string,
  actorId: string | null,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Material not found', 404);
  }

  // Soft deletion preserves storage until an explicit permanent deletion.
  await repository.softDelete(id);

  logFromContext({
    actorId,
    action: 'material.delete',
    targetType: 'Material',
    targetId: id,
  });
}

export async function getPublicMaterialsBySolution(
  solutionId: string,
): Promise<
  {
    id: string;
    type: string;
    title: string;
    previewPages: number;
    mimeType?: string;
    pageCount?: number | null;
  }[]
> {
  const materials = await repository.findMany({
    page: 1,
    limit: 100,
    solutionId,
    status: 'ACTIVE',
  });

  return materials.items.map((material) => ({
    id: material.id,
    type: material.type,
    title: material.title,
    previewPages: material.previewPages,
    mimeType: material.mimeType,
    pageCount: material.pageCount,
  }));
}

export async function getPreviewUrl(
  materialId: string,
  isAuthenticated: boolean,
): Promise<{
  url: string;
  previewPages: number;
  mimeType: string;
  previewMimeType: string;
  canInlinePreview: boolean;
  isLimitedPreview: boolean;
  expiresInSeconds: number;
}> {
  const material = await repository.findActiveById(materialId);
  if (!material) {
    throw new AppError(3001, 'Material not found', 404);
  }

  const adapter = getStorageAdapter();
  let storageKey: string | null = null;
  let isLimitedPreview = false;

  if (material.mimeType === 'application/pdf') {
    storageKey = isAuthenticated ? material.originalStorageKey : material.previewStorageKey;
    isLimitedPreview = !isAuthenticated;
  } else if (isOfficeMime(material.mimeType)) {
    const fullPreviewStorageKey =
      material.previewStorageKey ?? `previews/${material.originalStorageKey}.txt`;
    if (!refreshedOfficePreviewIds.has(material.id)) {
      const originalBuffer = await adapter.getObject(material.originalStorageKey);
      const originalName = `${material.title}${path.extname(material.originalStorageKey)}`;
      const limitedPreviewStorageKey = getLimitedOfficePreviewStorageKey(fullPreviewStorageKey);
      await Promise.all([
        adapter.putObject({
          storageKey: fullPreviewStorageKey,
          body: createOfficeTextPreview(originalBuffer, material.mimeType, originalName),
          contentType: 'text/plain; charset=utf-8',
        }),
        adapter.putObject({
          storageKey: limitedPreviewStorageKey,
          body: createOfficeTextPreview(originalBuffer, material.mimeType, originalName, true),
          contentType: 'text/plain; charset=utf-8',
        }),
      ]);
      if (material.previewStorageKey !== fullPreviewStorageKey) {
        await repository.update(material.id, { previewStorageKey: fullPreviewStorageKey });
      }
      refreshedOfficePreviewIds.add(material.id);
    }
    storageKey = isAuthenticated
      ? fullPreviewStorageKey
      : getLimitedOfficePreviewStorageKey(fullPreviewStorageKey);
    isLimitedPreview = !isAuthenticated;
  } else {
    storageKey = material.previewStorageKey;
    isLimitedPreview = !isAuthenticated;
  }
  if (!storageKey) {
    throw new AppError(3003, '预览未生成', 404);
  }
  const previewMimeType = storageKey.endsWith('.txt') ? 'text/plain' : material.mimeType;

  const url = await adapter.createSignedUrl({
    storageKey,
    expiresInSeconds: SIGNED_URL_EXPIRES,
    disposition: 'inline',
  });
  return {
    url,
    previewPages: material.previewPages,
    mimeType: material.mimeType,
    previewMimeType,
    canInlinePreview: material.mimeType === 'application/pdf' || previewMimeType === 'text/plain',
    isLimitedPreview,
    expiresInSeconds: SIGNED_URL_EXPIRES,
  };
}

export async function getDownloadUrl(
  materialId: string,
  user: AuthUser,
  ip?: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const material = await repository.findActiveById(materialId);
  if (!material) {
    throw new AppError(3001, 'Material not found', 404);
  }

  const adapter = getStorageAdapter();

  let downloadKey = material.originalStorageKey;
  let temporaryKey: string | null = null;

  if (material.mimeType === 'application/pdf') {
    const originalBuffer = await adapter.getObject(material.originalStorageKey);
    const watermarkedBuffer = await addWatermark(originalBuffer, user.email);
    temporaryKey = `tmp/watermark-${materialId}-${user.userId}-${Date.now()}.pdf`;
    await adapter.putObject({
      storageKey: temporaryKey,
      body: watermarkedBuffer,
      contentType: 'application/pdf',
    });
    downloadKey = temporaryKey;
  }

  const url = await adapter.createSignedUrl({
    storageKey: downloadKey,
    expiresInSeconds: SIGNED_URL_EXPIRES,
    disposition: 'attachment',
  });

  if (temporaryKey) {
    const cleanupTimer = setTimeout(() => {
      void adapter.removeObject(temporaryKey as string).catch(() => undefined);
    }, SIGNED_URL_EXPIRES * 1000);
    cleanupTimer.unref();
  }

  // 5. Write AuditLog
  logFromContext({
    actorId: user.userId,
    action: 'material_download',
    targetType: 'material',
    targetId: materialId,
    payload: { userId: user.userId, materialId, ip: ip ?? null },
  });

  // 6. Write LeadEvent (best-effort)
  try {
    const lead = await repository.findLeadByUserId(user.userId);
    if (lead) {
      await repository.createLeadEvent({
        leadId: lead.id,
        eventType: 'material_download',
        payload: { materialId, title: material.title },
      });
    }
  } catch {
    // LeadEvent is best-effort, must not break download
  }

  return { url, expiresInSeconds: SIGNED_URL_EXPIRES };
}

export async function getSolutionArchiveDownloadUrl(
  solutionId: string,
  user: AuthUser,
  ip?: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const solution = await prisma.solution.findFirst({
    where: { id: solutionId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });
  if (!solution) {
    throw new AppError(3001, 'Solution not found', 404);
  }

  const materials = await prisma.material.findMany({
    where: { solutionId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (materials.length === 0) {
    throw new AppError(3005, 'No active materials to download', 404);
  }

  const adapter = getStorageAdapter();
  const usedFilenames = new Map<string, number>();
  const entries = await Promise.all(
    materials.map(async (material) => {
      const originalBuffer = await adapter.getObject(material.originalStorageKey);
      const data =
        material.mimeType === 'application/pdf'
          ? await addWatermark(originalBuffer, user.email)
          : originalBuffer;
      return {
        filename: buildUniqueFilename(material, usedFilenames),
        data,
        date: material.updatedAt,
      };
    }),
  );

  const zipBuffer = createZipArchive(entries);
  const archiveName = sanitizeArchivePart(solution.name);
  const temporaryKey = `tmp/solution-${solutionId}-${user.userId}-${Date.now()}-${randomUUID()}.zip`;

  await adapter.putObject({
    storageKey: temporaryKey,
    body: zipBuffer,
    contentType: 'application/zip',
  });

  const url = await adapter.createSignedUrl({
    storageKey: temporaryKey,
    expiresInSeconds: SIGNED_URL_EXPIRES,
    disposition: 'attachment',
  });

  const cleanupTimer = setTimeout(() => {
    void adapter.removeObject(temporaryKey).catch(() => undefined);
  }, SIGNED_URL_EXPIRES * 1000);
  cleanupTimer.unref();

  logFromContext({
    actorId: user.userId,
    action: 'solution_materials_download',
    targetType: 'solution',
    targetId: solutionId,
    payload: { userId: user.userId, solutionId, ip: ip ?? null, archiveName },
  });

  return { url, expiresInSeconds: SIGNED_URL_EXPIRES };
}

export async function getSolutionOptions(): Promise<{ id: string; name: string }[]> {
  const solutions = await prisma.solution.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return solutions;
}

export async function getProductOptions(): Promise<{ id: string; model: string; series: string }[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, model: true, series: true },
    orderBy: { model: 'asc' },
  });
  return products;
}
