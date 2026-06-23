import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  chatHandler,
  listSessionsHandler,
  getSessionMessagesHandler,
  feedbackHandler,
} from './ai-chat.controller';

const router: Router = Router();

router.use(authMiddleware);

router.post('/chat', chatHandler);
router.get('/sessions', listSessionsHandler);
router.get('/sessions/:id/messages', getSessionMessagesHandler);
router.post('/messages/:id/feedback', feedbackHandler);

export default router;