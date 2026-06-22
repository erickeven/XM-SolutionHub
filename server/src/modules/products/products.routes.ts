import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './products.controller';

const router: Router = Router();

router.use(authMiddleware, roleGuard('ADMIN'), apiLimiter);

router.get('/', controller.listHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', controller.createHandler);
router.patch('/:id', controller.updateHandler);
router.delete('/:id', controller.deleteHandler);

export default router;