import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './field-config.controller';

const router: Router = Router();
const publicRouter: Router = Router();

publicRouter.get('/', controller.listEnabledHandler);

router.use(authMiddleware, permissionGuard('products.write'));

router.get('/', controller.listHandler);
router.post('/', controller.createHandler);
router.patch('/:id', controller.updateHandler);
router.patch('/:id/toggle', controller.toggleHandler);
router.delete('/:id', controller.deleteHandler);

export { router as fieldConfigRouter, publicRouter as publicFieldConfigRouter };
