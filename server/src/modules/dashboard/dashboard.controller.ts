import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { AppError } from '../../lib/errors';
import * as service from './dashboard.service';

export async function getSnapshotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(2001, 'Authentication required', 401);
    const snapshot = await service.getDashboardSnapshot(req.user.role, req.user.userId);
    res.status(200).json(successResponse(snapshot));
  } catch (err) {
    next(err);
  }
}