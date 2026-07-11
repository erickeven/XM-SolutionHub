import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './materials.controller';

// Admin routes — mounted at /api/v1/admin/materials
const adminRoutes: Router = Router();
adminRoutes.use(authMiddleware, permissionGuard('materials.write'), apiLimiter);

// Upload route with multer middleware
adminRoutes.post('/', controller.uploadMiddleware, controller.adminUploadHandler);
adminRoutes.get('/', controller.adminListHandler);

// Dropdown data helpers — must be BEFORE /:id to avoid shadowing
adminRoutes.get('/solutions-options', controller.solutionsOptionsHandler);
adminRoutes.get('/products-options', controller.productsOptionsHandler);

adminRoutes.get('/:id', controller.adminGetByIdHandler);
adminRoutes.patch('/:id', controller.adminUpdateHandler);
adminRoutes.delete('/:id', controller.adminDeleteHandler);
adminRoutes.delete('/:id/permanent', controller.adminHardDeleteHandler);

// Public routes — mounted at /api/v1/solutions/:id/materials
const publicRoutes: Router = Router({ mergeParams: true });
publicRoutes.use(apiLimiter);
publicRoutes.post('/download-all', authMiddleware, controller.downloadSolutionArchiveHandler);
publicRoutes.get('/', controller.publicListBySolutionHandler);

// Material preview/download routes — mounted at /api/v1/materials
const materialPublicRoutes: Router = Router();
materialPublicRoutes.use(apiLimiter);
materialPublicRoutes.get('/:id/preview-url', optionalAuth, controller.previewUrlHandler);
materialPublicRoutes.get('/:id/preview', optionalAuth, controller.previewHandler);
materialPublicRoutes.post(
  '/:id/download',
  authMiddleware,
  controller.downloadHandler,
);

export { adminRoutes, publicRoutes, materialPublicRoutes };
