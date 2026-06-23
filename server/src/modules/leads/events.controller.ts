import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { AppError } from '../../lib/errors';
import { eventSchema } from './leads.schema';
import { processEvent } from './events.service';

export async function createEventHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = eventSchema.parse(req.body);

    // If not authenticated, anonymousId is required
    const userId = req.user?.userId;
    if (!userId && !parsed.anonymousId) {
      throw new AppError(1002, 'anonymousId is required when not authenticated', 400);
    }

    const result = await processEvent(parsed, userId);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}