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

export async function exportAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = auditQuerySchema.parse(req.query);
    const csv = await auditService.exportAuditLogs(parsed);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${date}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}