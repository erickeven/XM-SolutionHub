import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { productQuerySchema, getCreateProductSchema, getUpdateProductSchema } from './products.schema';
import * as service from './products.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(1002, 'Missing product id', 400);
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = productQuerySchema.parse(req.query);
    const result = await service.listProducts(query);
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
    const product = await service.getProduct(id);
    res.status(200).json(successResponse(product));
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
    const schema = await getCreateProductSchema();
    const input = schema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const product = await service.createProduct(input, actorId);
    res.status(201).json(successResponse(product));
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
    const schema = await getUpdateProductSchema();
    const input = schema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const product = await service.updateProduct(id, input, actorId);
    res.status(200).json(successResponse(product));
  } catch (err) {
    next(err);
  }
}

export async function hardDeleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = requireId(req);
    const actorId = req.user?.userId;
    await service.hardDeleteProduct(id, actorId);
    res.json(successResponse(null, 'Product permanently deleted'));
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
    await service.deleteProduct(id, actorId);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}