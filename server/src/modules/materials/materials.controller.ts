import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { optionalAuth, type AuthUser } from '../../middleware/auth';
import {
  materialQuerySchema,
  createMaterialSchema,
  updateMaterialSchema,
} from './materials.schema';
import { upload, validateMagicBytes } from './multer.config';
import * as service from './materials.service';

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(1002, 'Missing id', 400);
  return id;
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
      // multer limit error
      if (err instanceof Error && err.message.includes('File too large')) {
        return next(new AppError(1003, 'File too large (max 50MB)', 400));
      }
      return next(err);
    }
    next();
  });
}

export { uploadMiddleware };

export async function adminUploadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(1004, 'No file uploaded', 400);
    }

    validateMagicBytes(req.file.buffer, req.file.mimetype);

    const input = createMaterialSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;

    const material = await service.createMaterial(
      {
        ...input,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      actorId,
    );

    res.status(201).json(successResponse(material));
  } catch (err) {
    next(err);
  }
}

export async function adminListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = materialQuerySchema.parse(req.query);
    const result = await service.listMaterials(query);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function adminGetByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const material = await service.getMaterial(id);
    res.status(200).json(successResponse(material));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const input = updateMaterialSchema.parse(req.body);
    const actorId = req.user?.userId ?? null;
    const material = await service.updateMaterial(id, input, actorId);
    res.status(200).json(successResponse(material));
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const actorId = req.user?.userId ?? null;
    await service.deleteMaterial(id, actorId);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}

export async function publicListBySolutionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const solutionId = requireId(req);
    // Use optionalAuth to determine if user is authenticated
    await optionalAuth(req, res, async () => {
      const isAuthenticated = req.user !== null;
      const materials = await service.getPublicMaterialsBySolution(
        solutionId,
        isAuthenticated,
      );
      res.status(200).json(successResponse({ items: materials }));
    });
  } catch (err) {
    next(err);
  }
}

export async function previewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    await optionalAuth(req, res, async () => {
      const isAuthenticated = req.user !== null;
      const result = await service.getPreviewUrl(id, isAuthenticated);
      res.redirect(302, result.url);
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req);
    const user = req.user as AuthUser;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? undefined;
    const result = await service.getDownloadUrl(id, user, ip);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function solutionsOptionsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = await service.getSolutionOptions();
    res.status(200).json(successResponse(options));
  } catch (err) {
    next(err);
  }
}

export async function productsOptionsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = await service.getProductOptions();
    res.status(200).json(successResponse(options));
  } catch (err) {
    next(err);
  }
}