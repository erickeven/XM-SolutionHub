import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
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

// POST /export — export CSV (defined before /:id routes to avoid shadowing)
router.post('/export', authMiddleware, permissionGuard('leads.write'), exportLeadsHandler);

// GET /:id — lead detail (STAFF+ with dataScope in controller)
router.get('/:id', authMiddleware, getLeadHandler);

// POST /:id/assign — assign lead to staff
router.post('/:id/assign', authMiddleware, permissionGuard('leads.write'), assignLeadHandler);

// PATCH /:id/status — update lead status (STAFF+ with dataScope in controller)
router.patch('/:id/status', authMiddleware, updateLeadStatusHandler);

export default router;