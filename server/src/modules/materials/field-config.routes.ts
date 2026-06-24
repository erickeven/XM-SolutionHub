import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import * as controller from './field-config.controller';

const router: Router = Router();

router.use(authMiddleware, roleGuard('ADMIN'));

router.get('/', controller.listHandler);
router.post('/', controller.createHandler);
router.patch('/:id', controller.updateHandler);
router.patch('/:id/toggle', controller.toggleHandler);
router.delete('/:id', controller.deleteHandler);

export { router as materialFieldConfigRouter };