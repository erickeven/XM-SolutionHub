import { AppError } from '../../lib/errors';
import { logFromContext } from '../audit/audit.service';
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

  const { productIds, ...updateData } = input;
  await repository.update(id, updateData);

  if (productIds !== undefined) {
    await repository.unlinkAllProducts(id);
    if (productIds.length > 0) {
      await repository.linkProducts(id, productIds);
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