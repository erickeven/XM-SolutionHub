import { AppError } from '../../lib/errors';
import { getStorageAdapter } from '../../lib/storage';
import { logFromContext } from '../audit/audit.service';
import * as repository from './materials.repository';
import type {
  CreateMaterialInput,
  MaterialQuery,
  MaterialPaginatedResult,
  MaterialDetail,
} from './materials.types';

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
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
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
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
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
  await adapter.putObject({
    storageKey,
    body: input.fileBuffer,
    contentType: input.mimeType,
  });

  const material = await repository.create({
    type: input.type,
    title: input.title,
    solutionId: input.solutionId,
    productId: input.productId,
    originalStorageKey: storageKey,
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
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

export async function updateMaterial(
  id: string,
  input: {
    status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    pageCount?: number;
    previewStorageKey?: string;
  },
  actorId: string | null,
): Promise<MaterialDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Material not found', 404);
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
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
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