import prisma from '../../lib/prisma';
import type { Solution } from '@prisma/client';
import type {
  CreateSolutionInput,
  UpdateSolutionInput,
  SolutionQuery,
} from './solutions.types';

export async function findMany(
  query: SolutionQuery,
): Promise<{ items: Solution[]; total: number }> {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.solution.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { productSolutions: true, materials: true } },
      },
    }),
    prisma.solution.count({ where }),
  ]);

  return { items, total };
}

export async function findById(id: string) {
  return prisma.solution.findUnique({
    where: { id },
    include: {
      materials: {
        select: { id: true, type: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
      productSolutions: {
        include: {
          product: {
            select: { id: true, model: true, series: true },
          },
        },
      },
    },
  });
}

export async function findActiveById(id: string) {
  return prisma.solution.findFirst({
    where: { id, status: 'ACTIVE' },
    include: {
      materials: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          type: true,
          title: true,
          mimeType: true,
          pageCount: true,
          previewPages: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      productSolutions: {
        where: { product: { status: 'ACTIVE' } },
        include: {
          product: {
            select: { id: true, model: true, series: true },
          },
        },
      },
    },
  });
}

export async function create(data: CreateSolutionInput): Promise<Solution> {
  return prisma.solution.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status ?? 'DRAFT',
    },
  });
}

export async function update(
  id: string,
  data: UpdateSolutionInput,
): Promise<Solution> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.solution.update({ where: { id }, data: updateData as never });
}

export async function softDelete(id: string): Promise<Solution> {
  return prisma.solution.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

export async function hardDelete(id: string): Promise<void> {
  await prisma.solution.delete({ where: { id } });
}

export async function linkProducts(
  solutionId: string,
  productIds: string[],
): Promise<void> {
  await prisma.productSolution.createMany({
    data: productIds.map((pid) => ({ solutionId, productId: pid })),
    skipDuplicates: true,
  });
}

export async function unlinkAllProducts(solutionId: string): Promise<void> {
  await prisma.productSolution.deleteMany({ where: { solutionId } });
}

export async function linkMaterials(
  solutionId: string,
  materialIds: string[],
): Promise<void> {
  await prisma.material.updateMany({
    where: { id: { in: materialIds } },
    data: { solutionId },
  });
}

export async function unlinkAllMaterials(solutionId: string): Promise<void> {
  await prisma.material.updateMany({
    where: { solutionId },
    data: { solutionId: null },
  });
}