import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { auditQuerySchema } from './audit.schema';
import * as auditService from './audit.service';

export async function getAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = auditQuerySchema.parse(req.query);
    const result = await auditService.query(parsed);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}