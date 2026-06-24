import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './rbac.controller';

const router: Router = Router();

// GET /permissions — list all permissions (grouped by resourceGroup)
router.get('/permissions', authMiddleware, permissionGuard('users.write'), controller.listPermissionsHandler);

// GET / — list all roles
router.get('/', authMiddleware, permissionGuard('users.write'), controller.listRolesHandler);

// GET /:id — get role detail with permissions
router.get('/:id', authMiddleware, permissionGuard('users.write'), controller.getRoleHandler);

// POST / — create role
router.post('/', authMiddleware, permissionGuard('users.write'), controller.createRoleHandler);

// PATCH /:id — update role
router.patch('/:id', authMiddleware, permissionGuard('users.write'), controller.updateRoleHandler);

// DELETE /:id — delete role
router.delete('/:id', authMiddleware, permissionGuard('users.write'), controller.deleteRoleHandler);

export default router;
