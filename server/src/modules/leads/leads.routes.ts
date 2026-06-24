import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import {
  listLeadsHandler,
  assignLeadHandler,
  updateLeadStatusHandler,
  exportLeadsHandler,
  getLeadHandler,
} from './leads.controller';

const router: Router = Router();

// GET / — list leads (STAFF+ with dataScope in controller)
router.get('/', authMiddleware, listLeadsHandler);

// POST /export — export CSV (AUDITOR+ only, defined before /:id routes to avoid shadowing)
router.post('/export', authMiddleware, roleGuard('AUDITOR'), exportLeadsHandler);

// GET /:id — lead detail (STAFF+ with dataScope in controller)
router.get('/:id', authMiddleware, getLeadHandler);

// POST /:id/assign — assign lead to staff (AUDITOR+)
router.post('/:id/assign', authMiddleware, roleGuard('AUDITOR'), assignLeadHandler);

// PATCH /:id/status — update lead status (STAFF+ with dataScope in controller)
router.patch('/:id/status', authMiddleware, updateLeadStatusHandler);

export default router;