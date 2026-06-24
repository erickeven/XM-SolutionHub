import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './knowledge.controller';

const router: Router = Router();

router.get('/', authMiddleware, permissionGuard('knowledge.read'), controller.listHandler);
router.get('/:id', authMiddleware, permissionGuard('knowledge.read'), controller.detailHandler);

router.post(
  '/',
  authMiddleware,
  permissionGuard('knowledge.write'),
  controller.uploadMiddleware,
  controller.createHandler,
);
router.patch('/:id', authMiddleware, permissionGuard('knowledge.write'), controller.updateHandler);
router.delete('/:id', authMiddleware, permissionGuard('knowledge.write'), controller.deleteHandler);
router.post('/:id/reindex', authMiddleware, permissionGuard('knowledge.write'), controller.reindexHandler);
router.get('/:id/trace', authMiddleware, permissionGuard('knowledge.read'), controller.traceHandler);

export default router;