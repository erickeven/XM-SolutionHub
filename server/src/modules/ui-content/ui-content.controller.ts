import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { createUiContentSchema, updateUiContentSchema } from './ui-content.schema';
import * as service from './ui-content.service';

export async function publicListHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json(successResponse(await service.listPublic()));
  } catch (error) {
    next(error);
  }
}

export async function adminListHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json(successResponse(await service.listAdmin()));
  } catch (error) {
    next(error);
  }
}

export async function adminCreateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createUiContentSchema.parse(req.body);
    res.status(201).json(successResponse(await service.createContent(input)));
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateUiContentSchema.parse(req.body);
    res.status(200).json(successResponse(await service.updateContent(req.params.id ?? '', input)));
  } catch (error) {
    next(error);
  }
}
