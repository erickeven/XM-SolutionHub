import { AppError } from '../../lib/errors';
import { getStorageAdapter } from '../../lib/storage';
import { addWatermark } from '../../lib/pdf/watermark';
import {
  extractFirstNPages,
  getPdfPageCount,
} from '../../lib/pdf/derive';
import { logFromContext } from '../audit/audit.service';
import type { AuthUser } from '../../middleware/auth';
import prisma from '../../lib/prisma';
import * as repository from './materials.repository';
import type {
  CreateMaterialInput,
  MaterialQuery,
  MaterialPaginatedResult,
  MaterialDetail,
} from './materials.types';

const SIGNED_URL_EXPIRES = 600;

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
  input: {
    status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    metadata?: Record<string, unknown>;
  },
  actorId: string | null,
): Promise<MaterialDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Material not found', 404);
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

export async function deleteMaterial(
  id: string,
  actorId: string | null,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Material not found', 404);
  }

  // Remove file from storage
  const adapter = getStorageAdapter();
  try {
    await adapter.removeObject(existing.originalStorageKey);
    if (existing.previewStorageKey) {
      await adapter.removeObject(existing.previewStorageKey);
    }
  } catch {
    // Storage cleanup is best-effort; still soft-delete the record
  }

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
  isAuthenticated: boolean,
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

  return materials.items.map((m) => {
    if (isAuthenticated) {
      return {
        id: m.id,
        type: m.type,
        title: m.title,
        previewPages: m.previewPages,
        mimeType: m.mimeType,
        pageCount: m.pageCount,
      };
    }
    // Anonymous: only id, title, type, previewPages
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      previewPages: m.previewPages,
    };
  });
}

export async function getPreviewUrl(
  materialId: string,
  isAuthenticated: boolean,
): Promise<{ url: string; previewPages: number }> {
  const material = await repository.findActiveById(materialId);
  if (!material) {
    throw new AppError(3001, 'Material not found', 404);
  }

  const adapter = getStorageAdapter();

  if (isAuthenticated) {
    // Authenticated: full PDF, inline
    const url = await adapter.createSignedUrl({
      storageKey: material.originalStorageKey,
      expiresInSeconds: SIGNED_URL_EXPIRES,
      disposition: 'inline',
    });
    return { url, previewPages: material.previewPages };
  }

  // Anonymous: preview PDF (3 pages), inline
  if (!material.previewStorageKey) {
    throw new AppError(3003, '预览未生成', 404);
  }

  const url = await adapter.createSignedUrl({
    storageKey: material.previewStorageKey,
    expiresInSeconds: SIGNED_URL_EXPIRES,
    disposition: 'inline',
  });
  return { url, previewPages: material.previewPages };
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
