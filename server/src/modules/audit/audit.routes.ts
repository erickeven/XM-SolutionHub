import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import { getAuditLogsHandler, exportAuditLogsHandler } from './audit.controller';

const router: Router = Router();

router.get('/', authMiddleware, permissionGuard('audit.read'), getAuditLogsHandler);
router.post('/export', authMiddleware, permissionGuard('audit.read'), exportAuditLogsHandler);

export default router;