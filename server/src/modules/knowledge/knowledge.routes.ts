import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import * as controller from './knowledge.controller';

const router: Router = Router();

// AUDITOR can GET (view); ADMIN can mutate
router.get('/', authMiddleware, roleGuard(['ADMIN', 'AUDITOR']), controller.listHandler);
router.get('/:id', authMiddleware, roleGuard(['ADMIN', 'AUDITOR']), controller.detailHandler);

// Mutations — ADMIN only
router.post('/', authMiddleware, roleGuard('ADMIN'), controller.createHandler);
router.patch('/:id', authMiddleware, roleGuard('ADMIN'), controller.updateHandler);
router.delete('/:id', authMiddleware, roleGuard('ADMIN'), controller.deleteHandler);
router.post('/:id/reindex', authMiddleware, roleGuard('ADMIN'), controller.reindexHandler);
router.get('/:id/trace', authMiddleware, roleGuard(['ADMIN', 'AUDITOR']), controller.traceHandler);

export default router;