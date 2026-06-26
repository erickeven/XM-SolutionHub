import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { permissionGuard } from '../../middleware/permissionGuard';
import * as controller from './ai-settings.controller';

const router: Router = Router();

// GET /ai-settings — list all providers
router.get('/', authMiddleware, permissionGuard('settings.ai.read'), controller.listProvidersHandler);

// GET /ai-settings/:id — get provider detail
router.get('/:id', authMiddleware, permissionGuard('settings.ai.read'), controller.getProviderHandler);

// PATCH /ai-settings/:id — update provider
router.patch('/:id', authMiddleware, permissionGuard('settings.ai.write'), controller.updateProviderHandler);

// POST /ai-settings/test — test connection
router.post('/test', authMiddleware, permissionGuard('settings.ai.write'), controller.testConnectionHandler);

export default router;

export const promptRouter: Router = Router();

// GET /ai-prompts — list all prompts
promptRouter.get('/', authMiddleware, permissionGuard('settings.ai.read'), controller.listPromptsHandler);

// GET /ai-prompts/:id — get prompt detail
promptRouter.get('/:id', authMiddleware, permissionGuard('settings.ai.read'), controller.getPromptHandler);

// PATCH /ai-prompts/:id — update prompt
promptRouter.patch('/:id', authMiddleware, permissionGuard('settings.ai.write'), controller.updatePromptHandler);