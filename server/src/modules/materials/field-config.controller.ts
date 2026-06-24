import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { createFieldConfigSchema, updateFieldConfigSchema } from './field-config.schema';
import * as service from './field-config.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(1002, 'Missing field config id', 400);
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const enabledOnly = req.query.enabled === 'true' ? true : undefined;
    const fields = await service.listFields(enabledOnly);
    res.status(200).json(successResponse(fields));
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
    const input = createFieldConfigSchema.parse(req.body);
    const field = await service.createField(input);
    res.status(201).json(successResponse(field));
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
    const input = updateFieldConfigSchema.parse(req.body);
    const field = await service.updateField(id, input);
    res.status(200).json(successResponse(field));
  } catch (err) {
    next(err);
  }
}

export async function toggleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const enabled = req.body.enabled === true;
    const result = await service.toggleField(id, enabled);
    res.status(200).json(successResponse(result));
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
    await service.deleteField(id);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}