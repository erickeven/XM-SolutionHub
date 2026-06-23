import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import {
  createKnowledgeSchema,
  updateKnowledgeSchema,
  knowledgeListQuerySchema,
} from './knowledge.schema';
import * as service from './knowledge.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) {
    throw new AppError(1002, 'Missing id', 400);
  }
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = knowledgeListQuerySchema.parse(req.query);
    const result = await service.listDocs(query.page, query.pageSize, query.status);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function detailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const doc = await service.getDoc(id);
    res.status(200).json(successResponse(doc));
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
    const input = createKnowledgeSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const doc = await service.createDoc(input, actorId);
    res.status(201).json(successResponse(doc));
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
    const input = updateKnowledgeSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const doc = await service.updateDoc(id, input, actorId);
    res.status(200).json(successResponse(doc));
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
    await service.deleteDoc(id, actorId);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}

export async function reindexHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const actorId = req.user?.userId ?? null;
    const result = await service.reindex(id, actorId);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function traceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const result = await service.getTrace(id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}