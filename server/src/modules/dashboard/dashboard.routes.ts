import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './dashboard.controller';

const router: Router = Router();

router.use(authMiddleware, permissionGuard('admin.dashboard.read'));

router.get('/', controller.getSnapshotHandler);

export default router;
