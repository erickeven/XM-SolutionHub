import prisma from '../../lib/prisma';
import type { Product } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { logFromContext } from '../audit/audit.service';
import * as repository from './products.repository';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  ProductPaginatedResult,
  ProductDetail,
} from './products.types';

function isUniqueConstraintFor(error: unknown, field: string): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false;
  if ((error as { code?: unknown }).code !== 'P2002') return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(target)
    ? target.some((item) => String(item) === field)
    : String(target ?? '').includes(field);
}

async function assertDatasheetUsable(
  datasheetMaterialId: string | null | undefined,
  productId?: string,
): Promise<void> {
  if (!datasheetMaterialId) return;

  const material = await prisma.material.findFirst({
    where: {
      id: datasheetMaterialId,
      status: { not: 'INACTIVE' },
      type: 'datasheet',
      mimeType: 'application/pdf',
    },
    select: { id: true, productId: true },
  });

  if (!material) {
    throw new AppError(3003, 'Datasheet material must be an available PDF datasheet', 400);
  }

  if (material.productId && material.productId !== productId) {
    throw new AppError(3004, 'Datasheet is already associated with another product', 409);
  }

  const linkedProduct = await prisma.product.findFirst({
    where: {
      datasheetMaterialId,
      ...(productId ? { id: { not: productId } } : {}),
    },
    select: { id: true },
  });
  if (linkedProduct) {
    throw new AppError(3004, 'Datasheet is already associated with another product', 409);
  }
}

export async function listProducts(
  query: ProductQuery,
): Promise<ProductPaginatedResult> {
  const { items, total } = await repository.findMany(query);
  return {
    items: items.map((p) => ({
      id: p.id,
      model: p.model,
      series: p.series,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const product = await repository.findById(id);
  if (!product) {
    throw new AppError(3001, 'Product not found', 404);
  }
  return {
    id: product.id,
    model: product.model,
    series: product.series,
    status: product.status,
    params: product.params as never,
    advantages: product.advantages,
    datasheetMaterialId: product.datasheetMaterialId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function createProduct(
  input: CreateProductInput,
  actorId: string | null,
): Promise<ProductDetail> {
  const existing = await repository.findByModel(input.model);
  if (existing) {
    throw new AppError(3002, 'Product model already exists', 409);
  }

  await assertDatasheetUsable(input.datasheetMaterialId);

  let product: Product;
  try {
    product = await repository.create(input);
  } catch (error) {
    if (isUniqueConstraintFor(error, 'datasheetMaterialId')) {
      throw new AppError(3004, 'Datasheet is already associated with another product', 409);
    }
    if (isUniqueConstraintFor(error, 'model')) {
      throw new AppError(3002, 'Product model already exists', 409);
    }
    throw error;
  }

  logFromContext({
    actorId,
    action: 'product.create',
    targetType: 'Product',
    targetId: product.id,
    payload: { model: input.model, series: input.series },
  });

  return {
    id: product.id,
    model: product.model,
    series: product.series,
    status: product.status,
    params: product.params as never,
    advantages: product.advantages,
    datasheetMaterialId: product.datasheetMaterialId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actorId: string | null,
): Promise<ProductDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Product not found', 404);
  }

  await assertDatasheetUsable(input.datasheetMaterialId, id);

  let product: Product;
  try {
    product = await repository.update(id, input);
  } catch (error) {
    if (isUniqueConstraintFor(error, 'datasheetMaterialId')) {
      throw new AppError(3004, 'Datasheet is already associated with another product', 409);
    }
    if (isUniqueConstraintFor(error, 'model')) {
      throw new AppError(3002, 'Product model already exists', 409);
    }
    throw error;
  }

  logFromContext({
    actorId,
    action: 'product.update',
    targetType: 'Product',
    targetId: id,
    payload: input as Record<string, unknown>,
  });

  return {
    id: product.id,
    model: product.model,
    series: product.series,
    status: product.status,
    params: product.params as never,
    advantages: product.advantages,
    datasheetMaterialId: product.datasheetMaterialId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function hardDeleteProduct(id: string, actorId?: string): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) throw new AppError(3001, 'Product not found', 404);
  if (existing.status !== 'INACTIVE') {
    throw new AppError(4001, 'Cannot permanently delete active product. Move to recycle bin first.', 400);
  }
  await prisma.$transaction(async (tx) => {
    // Clean up ProductSolution associations (no DB-level onDelete)
    await tx.productSolution.deleteMany({ where: { productId: id } });
    // Delete product (Material.productId auto-set to null via onDelete: SetNull)
    await tx.product.delete({ where: { id } });
  });
  if (actorId) {
    logFromContext({ actorId, action: 'product.hardDelete', targetType: 'Product', targetId: id });
  }
}

export async function deleteProduct(
  id: string,
  actorId: string | null,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Product not found', 404);
  }

  await repository.softDelete(id);

  logFromContext({
    actorId,
    action: 'product.delete',
    targetType: 'Product',
    targetId: id,
  });
}
