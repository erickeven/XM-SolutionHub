import { Router, type Router as RouterType } from 'express';
import { apiLimiter } from '../../middleware/rateLimit';
import * as controller from './products.public.controller';

const router: RouterType = Router();

router.use(apiLimiter);
router.get('/', controller.publicListHandler);
router.get('/:id', controller.publicGetByIdHandler);

export default router;