import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import * as controller from './knowledge.controller';

const router: Router = Router();

router.use(authMiddleware, roleGuard('ADMIN'));

router.get('/', controller.listHandler);
router.get('/:id', controller.detailHandler);
router.post('/', controller.createHandler);
router.patch('/:id', controller.updateHandler);
router.delete('/:id', controller.deleteHandler);
router.post('/:id/reindex', controller.reindexHandler);
router.get('/:id/trace', controller.traceHandler);

export default router;