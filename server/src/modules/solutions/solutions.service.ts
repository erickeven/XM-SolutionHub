import { AppError } from '../../lib/errors';
import { logFromContext } from '../audit/audit.service';
import prisma from '../../lib/prisma';
import * as repository from './solutions.repository';
import type {
  CreateSolutionInput,
  UpdateSolutionInput,
  SolutionQuery,
  SolutionPaginatedResult,
  SolutionDetail,
} from './solutions.types';

export async function listSolutions(
  query: SolutionQuery,
): Promise<SolutionPaginatedResult> {
  const { items, total } = await repository.findMany(query);
  return {
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      productCount: (s as never as { _count: { productSolutions: number } })._count.productSolutions,
      materialCount: (s as never as { _count: { materials: number } })._count.materials,
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getSolution(id: string): Promise<SolutionDetail> {
  const solution = await repository.findById(id);
  if (!solution) {
    throw new AppError(3001, 'Solution not found', 404);
  }
  return {
    id: solution.id,
    name: solution.name,
    description: solution.description,
    status: solution.status,
    createdAt: solution.createdAt,
    updatedAt: solution.updatedAt,
    materials: solution.materials.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      status: m.status,
    })),
    products: solution.productSolutions.map((ps) => ({
      id: ps.product.id,
      model: ps.product.model,
      series: ps.product.series,
    })),
      productIds: solution.productSolutions.map((ps) => ps.productId),
      materialIds: solution.materials.map((m) => m.id),
  };
}

export async function getPublicSolution(id: string): Promise<{
  id: string;
  name: string;
  description: string;
  materials: { id: string; type: string; title: string; previewPages: number }[];
  products: { id: string; model: string; series: string }[];
}> {
  const solution = await repository.findActiveById(id);
  if (!solution) {
    throw new AppError(3001, 'Solution not found', 404);
  }
  return {
    id: solution.id,
    name: solution.name,
    description: solution.description,
    materials: solution.materials.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      previewPages: m.previewPages,
    })),
    products: solution.productSolutions.map((ps) => ({
      id: ps.product.id,
      model: ps.product.model,
      series: ps.product.series,
    })),
  };
}

export async function createSolution(
  input: CreateSolutionInput,
  actorId: string | null,
): Promise<SolutionDetail> {
  const solution = await repository.create(input);

  if (input.productIds && input.productIds.length > 0) {
    await repository.linkProducts(solution.id, input.productIds);
  }

  if (input.materialIds && input.materialIds.length > 0) {
    await repository.linkMaterials(solution.id, input.materialIds);
  }

  logFromContext({
    actorId,
    action: 'solution.create',
    targetType: 'Solution',
    targetId: solution.id,
    payload: { name: input.name, description: input.description },
  });

  // Re-fetch with products
  return getSolution(solution.id);
}

export async function updateSolution(
  id: string,
  input: UpdateSolutionInput,
  actorId: string | null,
): Promise<SolutionDetail> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Solution not found', 404);
  }

  const { productIds, materialIds, ...updateData } = input;
  await repository.update(id, updateData);

  if (productIds !== undefined) {
    await repository.unlinkAllProducts(id);
    if (productIds.length > 0) {
      await repository.linkProducts(id, productIds);
    }
  }

  if (materialIds !== undefined) {
    await repository.unlinkAllMaterials(id);
    if (materialIds.length > 0) {
      await repository.linkMaterials(id, materialIds);
    }
  }

  logFromContext({
    actorId,
    action: 'solution.update',
    targetType: 'Solution',
    targetId: id,
    payload: input as Record<string, unknown>,
  });

  // Re-fetch with products
  return getSolution(id);
}

export async function getAllProductOptions(): Promise<
  { id: string; model: string; series: string; status: string }[]
> {
  return prisma.product.findMany({
    select: { id: true, model: true, series: true, status: true },
    orderBy: { model: 'asc' },
  });
}

export async function deleteSolution(
  id: string,
  actorId: string | null,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(3001, 'Solution not found', 404);
  }

  await repository.softDelete(id);

  logFromContext({
    actorId,
    action: 'solution.delete',
    targetType: 'Solution',
    targetId: id,
  });
}