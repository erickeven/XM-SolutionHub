import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { csrfMiddleware } from '../../middleware/csrf';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  passwordResetHandler,
  passwordResetConfirmHandler,
} from './auth.controller';

const router: Router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', csrfMiddleware, refreshHandler);
router.post('/logout', csrfMiddleware, logoutHandler);
router.get('/me', authMiddleware, meHandler);
router.post('/password-reset', passwordResetHandler);
router.post('/password-reset/confirm', passwordResetConfirmHandler);

export default router;
