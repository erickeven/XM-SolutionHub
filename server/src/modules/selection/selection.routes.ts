import { Router } from 'express';
import { apiLimiter } from '../../middleware/rateLimit';
import { matchHandler, popularHandler } from './selection.controller';

const router: Router = Router();

router.post('/match', apiLimiter, matchHandler);
router.get('/popular', apiLimiter, popularHandler);

export default router;