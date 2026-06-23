import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './materials.controller';

// Admin routes — mounted at /api/v1/admin/materials
const adminRoutes: Router = Router();
adminRoutes.use(authMiddleware, roleGuard('ADMIN'), apiLimiter);

// Upload route with multer middleware
adminRoutes.post('/', controller.uploadMiddleware, controller.adminUploadHandler);
adminRoutes.get('/', controller.adminListHandler);
adminRoutes.get('/:id', controller.adminGetByIdHandler);
adminRoutes.patch('/:id', controller.adminUpdateHandler);
adminRoutes.delete('/:id', controller.adminDeleteHandler);

// Public routes — mounted at /api/v1/solutions/:id/materials
const publicRoutes: Router = Router();
publicRoutes.use(apiLimiter);
publicRoutes.get('/', controller.publicListBySolutionHandler);

// Material preview/download routes — mounted at /api/v1/materials
const materialPublicRoutes: Router = Router();
materialPublicRoutes.use(apiLimiter);
materialPublicRoutes.get('/:id/preview', controller.previewHandler);
materialPublicRoutes.post(
  '/:id/download',
  authMiddleware,
  controller.downloadHandler,
);

export { adminRoutes, publicRoutes, materialPublicRoutes };