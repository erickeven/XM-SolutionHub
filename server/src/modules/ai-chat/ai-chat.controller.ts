import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { AppError } from '../../lib/errors';
import * as aiChatService from './ai-chat.service';
import { chatSchema, feedbackSchema } from './ai-chat.schema';

export async function chatHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const parsed = chatSchema.parse(req.body);
    await aiChatService.chat(
      res,
      req.user.userId,
      req.user.role,
      parsed.query,
      parsed.sessionId,
    );
  } catch (err) {
    next(err);
  }
}

export async function listSessionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
    const filterUserId = req.query.userId as string | undefined;

    const result = await aiChatService.listSessions(
      req.user.userId,
      req.user.role,
      page,
      pageSize,
      filterUserId,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function getSessionMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const sessionId = req.params.id;
    if (!sessionId) {
      throw new AppError(1001, 'Session ID is required', 400);
    }
    const result = await aiChatService.getSessionMessages(
      sessionId,
      req.user.userId,
      req.user.role,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function feedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(2001, 'Unauthorized', 401);
    }
    const messageId = req.params.id;
    if (!messageId) {
      throw new AppError(1001, 'Message ID is required', 400);
    }
    const parsed = feedbackSchema.parse(req.body);
    const result = await aiChatService.updateFeedback(
      messageId,
      req.user.userId,
      parsed,
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}