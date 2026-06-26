import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './solutions.controller';

// Admin routes — mounted at /api/v1/admin/solutions
const adminRoutes: Router = Router();
adminRoutes.use(authMiddleware, permissionGuard('solutions.write'), apiLimiter);
adminRoutes.get('/', controller.listHandler);
adminRoutes.get('/product-options', controller.productOptionsHandler);
adminRoutes.get('/:id', controller.getByIdHandler);
adminRoutes.post('/', controller.createHandler);
adminRoutes.patch('/:id', controller.updateHandler);
adminRoutes.delete('/:id', controller.deleteHandler);

// Public routes — mounted at /api/v1/solutions
const publicRoutes: Router = Router();
publicRoutes.use(apiLimiter);
publicRoutes.get('/', controller.publicListHandler);
publicRoutes.get('/:id', controller.publicGetByIdHandler);

export { adminRoutes, publicRoutes };
