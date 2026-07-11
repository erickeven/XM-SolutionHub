import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './ui-content.controller';

export const publicUiContentRoutes: Router = Router();
publicUiContentRoutes.get('/', controller.publicListHandler);

export const adminUiContentRoutes: Router = Router();
adminUiContentRoutes.get(
  '/',
  authMiddleware,
  permissionGuard('settings.ui.read'),
  controller.adminListHandler,
);
adminUiContentRoutes.post(
  '/',
  authMiddleware,
  permissionGuard('settings.ui.write'),
  controller.adminCreateHandler,
);
adminUiContentRoutes.patch(
  '/:id',
  authMiddleware,
  permissionGuard('settings.ui.write'),
  controller.adminUpdateHandler,
);
