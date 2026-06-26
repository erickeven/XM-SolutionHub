import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { updateProviderSchema, testConnectionSchema, updatePromptSchema } from './ai-settings.schema';
import * as service from './ai-settings.service';

export async function listProvidersHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await service.listProviders();
    res.status(200).json(successResponse({ items }));
  } catch (err) {
    next(err);
  }
}

export async function getProviderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing provider id', 400);
    const provider = await service.getProvider(id);
    res.status(200).json(successResponse(provider));
  } catch (err) {
    next(err);
  }
}

export async function updateProviderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing provider id', 400);
    const input = updateProviderSchema.parse(req.body);
    const provider = await service.updateProvider(id, input);
    res.status(200).json(successResponse(provider));
  } catch (err) {
    next(err);
  }
}

export async function testConnectionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // validate body shape even if we don't use it yet
    testConnectionSchema.parse(req.body);
    const result = await service.testConnection();
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function listPromptsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await service.listPrompts();
    res.status(200).json(successResponse({ items }));
  } catch (err) {
    next(err);
  }
}

export async function getPromptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing prompt id', 400);
    const prompt = await service.getPrompt(id);
    res.status(200).json(successResponse(prompt));
  } catch (err) {
    next(err);
  }
}

export async function updatePromptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing prompt id', 400);
    const input = updatePromptSchema.parse(req.body);
    const prompt = await service.updatePrompt(id, input);
    res.status(200).json(successResponse(prompt));
  } catch (err) {
    next(err);
  }
}