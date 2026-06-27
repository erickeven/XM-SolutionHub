import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './products.controller';

const router: Router = Router();

router.use(authMiddleware, permissionGuard('products.write'), apiLimiter);

router.get('/', controller.listHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', controller.createHandler);
router.patch('/:id', controller.updateHandler);
router.delete('/:id', controller.deleteHandler);
router.delete('/:id/permanent', controller.hardDeleteHandler);

export default router;