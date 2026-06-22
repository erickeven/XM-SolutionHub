import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { selectionInputSchema } from './selection.schema';
import * as repository from './selection.repository';
import { matchProducts } from './selection.service';

export async function matchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = selectionInputSchema.parse(req.body);
    const products = await repository.findActiveProducts();
    const results = matchProducts(input, products);
    res.status(200).json(successResponse(results));
  } catch (err) {
    next(err);
  }
}

export async function popularHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const products = await repository.findPopularProducts(10);
    res.status(200).json(successResponse(products));
  } catch (err) {
    next(err);
  }
}