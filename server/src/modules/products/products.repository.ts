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
  return prisma.product.create({
    data: {
      model: data.model,
      series: data.series,
      status: data.status ?? 'DRAFT',
      params: data.params as never,
      advantages: data.advantages,
    },
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
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.product.update({ where: { id }, data: updateData as never });
}

export async function softDelete(id: string): Promise<Product> {
  return prisma.product.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
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