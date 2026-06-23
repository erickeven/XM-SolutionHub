import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './users.schema';
import * as service from './users.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(1002, 'Missing user id', 400);
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await service.listUsers(query);
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
    const user = await service.getUser(id);
    res.status(200).json(successResponse(user));
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
    const input = createUserSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    if (!actorId) {
      throw new AppError(2001, 'Authentication required', 401);
    }
    const user = await service.createUser(actorId, input);
    res.status(201).json(successResponse(user));
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
    const input = updateUserSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    if (!actorId) {
      throw new AppError(2001, 'Authentication required', 401);
    }
    const user = await service.updateUser(actorId, id, input);
    res.status(200).json(successResponse(user));
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
    if (!actorId) {
      throw new AppError(2001, 'Authentication required', 401);
    }
    await service.deleteUser(actorId, id);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}
