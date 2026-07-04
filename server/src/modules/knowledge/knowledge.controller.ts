import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import {
  createKnowledgeSchema,
  updateKnowledgeSchema,
  knowledgeListQuerySchema,
} from './knowledge.schema';
import { upload, validateMagicBytes } from '../materials/multer.config';
import * as service from './knowledge.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) {
    throw new AppError(1002, 'Missing id', 400);
  }
  return id;
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = knowledgeListQuerySchema.parse(req.query);
    const result = await service.listDocs(query.page, query.pageSize, query.status);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function detailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const doc = await service.getDoc(id);
    res.status(200).json(successResponse(doc));
  } catch (err) {
    next(err);
  }
}

// Multer middleware wrapper to convert multer errors to AppError
function uploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if (err instanceof Error && err.message.includes('File too large')) {
        return next(new AppError(1003, 'File too large (max 50MB)', 400));
      }
      return next(err);
    }
    next();
  });
}

export { uploadMiddleware };

export async function createHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate body with zod (handles both JSON and multipart fields)
    const parsed = createKnowledgeSchema.parse(req.body);

    // Validate: must have materialId OR file upload
    if (!parsed.materialId && !req.file) {
      throw new AppError(1004, 'Either materialId or file is required', 400);
    }

    // Validate magic bytes for file upload
    if (req.file) {
      validateMagicBytes(req.file.buffer, req.file.mimetype);
    }

    const actorId = req.user?.userId ?? null;

    // Resolve title: from input or fallback to filename (without extension)
    const fileName = req.file?.originalname.replace(/\.[^/.]+$/, '');
    const resolvedTitle = parsed.title || fileName || undefined;

    const doc = await service.createDoc(
      {
        materialId: parsed.materialId,
        title: resolvedTitle,
        sourceType: parsed.sourceType,
        fileBuffer: req.file?.buffer,
        originalName: req.file?.originalname,
        mimeType: req.file?.mimetype,
      },
      actorId,
    );

    res.status(201).json(successResponse(doc));
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
    const input = updateKnowledgeSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const doc = await service.updateDoc(id, input, actorId);
    res.status(200).json(successResponse(doc));
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
    await service.deleteDoc(id, actorId);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}

export async function reindexHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const actorId = req.user?.userId ?? null;
    const result = await service.reindex(id, actorId);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function traceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const result = await service.getTrace(id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}