import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import * as repository from './products.repository';

const publicProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

interface PublicProductListItem {
  id: string;
  model: string;
  series: string;
  params: unknown;
  advantages: string[];
  datasheetMaterialId: string | null;
}

interface PublicSolutionSummary {
  id: string;
  name: string;
  description: string;
}

interface PublicProductDetail extends PublicProductListItem {
  solutions: PublicSolutionSummary[];
}

function toPublicListItem(p: {
  id: string;
  model: string;
  series: string;
  params: unknown;
  advantages: string[];
  datasheetMaterialId: string | null;
}, activeDatasheetIds?: Set<string>): PublicProductListItem {
  const datasheetMaterialId =
    p.datasheetMaterialId && activeDatasheetIds?.has(p.datasheetMaterialId)
      ? p.datasheetMaterialId
      : null;
  return {
    id: p.id,
    model: p.model,
    series: p.series,
    params: p.params,
    advantages: p.advantages,
    datasheetMaterialId,
  };
}

export async function publicListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = publicProductQuerySchema.parse(req.query);
    const { items, total } = await repository.findActiveProductsPaginated(query);
    const activeDatasheetIds = await repository.findActiveDatasheetIds(
      items.map((item) => item.datasheetMaterialId).filter((id): id is string => Boolean(id)),
    );
    res.status(200).json(
      successResponse({
        items: items.map((item) => toPublicListItem(item, activeDatasheetIds)),
        total,
        page: query.page,
        limit: query.limit,
      }),
    );
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
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing product id', 400);

    const product = await repository.findByIdActive(id);
    if (!product) {
      throw new AppError(3001, 'Product not found', 404);
    }
    const activeDatasheetIds = await repository.findActiveDatasheetIds(
      product.datasheetMaterialId ? [product.datasheetMaterialId] : [],
    );

    const detail: PublicProductDetail = {
      id: product.id,
      model: product.model,
      series: product.series,
      params: product.params,
      advantages: product.advantages,
      datasheetMaterialId:
        product.datasheetMaterialId && activeDatasheetIds.has(product.datasheetMaterialId)
          ? product.datasheetMaterialId
          : null,
      solutions: product.productSolutions.map((ps) => ({
        id: ps.solution.id,
        name: ps.solution.name,
        description: ps.solution.description,
      })),
    };

    res.status(200).json(successResponse(detail));
  } catch (err) {
    next(err);
  }
}
