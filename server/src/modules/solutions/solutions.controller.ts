import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import {
  solutionQuerySchema,
  createSolutionSchema,
  updateSolutionSchema,
} from './solutions.schema';
import * as service from './solutions.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(1002, 'Missing solution id', 400);
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = solutionQuerySchema.parse(req.query);
    const result = await service.listSolutions(query);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function getByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const solution = await service.getSolution(id);
    res.status(200).json(successResponse(solution));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createSolutionSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const solution = await service.createSolution(input, actorId);
    res.status(201).json(successResponse(solution));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const input = updateSolutionSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const solution = await service.updateSolution(id, input, actorId);
    res.status(200).json(successResponse(solution));
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const actorId = req.user?.userId ?? null;
    await service.deleteSolution(id, actorId);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}

export async function publicGetByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const solution = await service.getPublicSolution(id);
    res.status(200).json(successResponse(solution));
  } catch (err) {
    next(err);
  }
}