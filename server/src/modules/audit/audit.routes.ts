import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { getAuditLogsHandler, exportAuditLogsHandler } from './audit.controller';

const router: Router = Router();

router.get('/', authMiddleware, roleGuard(['ADMIN', 'AUDITOR']), getAuditLogsHandler);
router.post('/export', authMiddleware, roleGuard(['ADMIN', 'AUDITOR']), exportAuditLogsHandler);

export default router;