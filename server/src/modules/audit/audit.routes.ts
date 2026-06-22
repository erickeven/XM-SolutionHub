import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { getAuditLogsHandler } from './audit.controller';

const router: Router = Router();

router.get('/', authMiddleware, roleGuard('ADMIN'), getAuditLogsHandler);

export default router;