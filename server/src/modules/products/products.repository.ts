import prisma from '../../lib/prisma';
import type { Product } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from './products.types';

export async function findMany(
  query: ProductQuery,
): Promise<{ items: Product[]; total: number }> {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { model: { contains: search, mode: 'insensitive' } },
      { series: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

export async function findById(id: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { id } });
}

export async function findByModel(model: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { model } });
}

export async function create(data: CreateProductInput): Promise<Product> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        model: data.model,
        series: data.series,
        status: data.status ?? 'DRAFT',
        params: data.params as never,
        advantages: data.advantages,
        datasheetMaterialId: data.datasheetMaterialId ?? null,
      },
    });
    if (data.datasheetMaterialId) {
      await tx.material.update({
        where: { id: data.datasheetMaterialId },
        data: { productId: product.id },
      });
    }
    return product;
  });
}

export async function update(
  id: string,
  data: UpdateProductInput,
): Promise<Product> {
  const updateData: Record<string, unknown> = {};
  if (data.model !== undefined) updateData.model = data.model;
  if (data.series !== undefined) updateData.series = data.series;
  if (data.params !== undefined) updateData.params = data.params as never;
  if (data.advantages !== undefined) updateData.advantages = data.advantages;
  if (data.datasheetMaterialId !== undefined)
    updateData.datasheetMaterialId = data.datasheetMaterialId;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUniqueOrThrow({
      where: { id },
      select: { datasheetMaterialId: true },
    });
    const product = await tx.product.update({ where: { id }, data: updateData as never });

    if (
      data.datasheetMaterialId !== undefined &&
      existing.datasheetMaterialId !== data.datasheetMaterialId
    ) {
      if (existing.datasheetMaterialId) {
        await tx.material.updateMany({
          where: { id: existing.datasheetMaterialId, productId: id },
          data: { productId: null },
        });
      }
      if (data.datasheetMaterialId) {
        await tx.material.update({
          where: { id: data.datasheetMaterialId },
          data: { productId: id },
        });
      }
    }

    return product;
  });
}

export async function softDelete(id: string): Promise<Product> {
  return prisma.product.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

export async function hardDelete(id: string): Promise<void> {
  await prisma.product.delete({ where: { id } });
}

// ── Public read-only queries (always ACTIVE) ──

export async function findActiveProductsPaginated(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<{ items: Product[]; total: number }> {
  const { page, limit, search } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'ACTIVE' };
  if (search) {
    where.OR = [
      { model: { contains: search, mode: 'insensitive' } },
      { series: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

export async function findByIdActive(id: string) {
  return prisma.product.findFirst({
    where: { id, status: 'ACTIVE' },
    include: {
      productSolutions: {
        where: { solution: { status: 'ACTIVE' } },
        include: {
          solution: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
  });
}

export async function findActiveDatasheetIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.material.findMany({
    where: {
      id: { in: ids },
      status: 'ACTIVE',
      type: 'datasheet',
      mimeType: 'application/pdf',
    },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}
