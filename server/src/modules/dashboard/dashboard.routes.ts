import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import * as controller from './dashboard.controller';

const router: Router = Router();

router.use(authMiddleware, roleGuard('STAFF'));

router.get('/', controller.getSnapshotHandler);

export default router;
