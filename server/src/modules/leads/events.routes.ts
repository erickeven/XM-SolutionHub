import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { createEventHandler } from './events.controller';

const router: Router = Router();
router.post('/', optionalAuth, createEventHandler);
export default router;