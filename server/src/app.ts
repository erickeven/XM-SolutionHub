import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config';
import { helmetMiddleware } from './middleware/helmet';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { authLimiter, eventLimiter } from './middleware/rateLimit';
import authRoutes from './modules/auth/auth.routes';
import auditRoutes from './modules/audit/audit.routes';
import productsRoutes from './modules/products/products.routes';
import productsPublicRoutes from './modules/products/products.public.routes';
import selectionRoutes from './modules/selection/selection.routes';
import { adminRoutes as solutionAdminRoutes, publicRoutes as solutionPublicRoutes } from './modules/solutions/solutions.routes';
import { adminRoutes as materialAdminRoutes, publicRoutes as materialPublicRoutes, materialPublicRoutes as materialPreviewRoutes } from './modules/materials/materials.routes';
import knowledgeRoutes from './modules/knowledge/knowledge.routes';
import aiChatRoutes from './modules/ai-chat/ai-chat.routes';
import eventsRoutes from './modules/leads/events.routes';
import leadsAdminRoutes from './modules/leads/leads.routes';
import usersRoutes from './modules/users/users.routes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();

// 1. Security headers
app.use(helmetMiddleware);

// 2. CORS (no wildcard)
app.use(corsMiddleware);

// 3. Body parsing
app.use(express.json());

// 4. Simple cookie parser (avoids adding cookie-parser dependency)
app.use((req, _res, next) => {
  const header = req.headers.cookie;
  if (header) {
    const cookies: Record<string, string> = {};
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
      }
    }
    req.cookies = cookies;
  }
  next();
});

// 5. Request ID
app.use(requestIdMiddleware);

// 6. Request logging
app.use(pinoHttp({ logger }));

// 7. Healthcheck
app.get('/api/v1/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'healthy' } });
});

// 8. Auth routes with rate limiting
app.use('/api/v1/auth', authLimiter, authRoutes);

// 9. Audit routes (admin only)
app.use('/api/v1/admin/audit', auditRoutes);

// 10. Selection routes (public, no auth required)
app.use('/api/v1/selection', selectionRoutes);

// 11. Products admin routes (admin only)
app.use('/api/v1/admin/products', productsRoutes);

// 12. Products public routes (no auth required)
app.use('/api/v1/products', productsPublicRoutes);

// 13. Solutions admin routes (admin only)
app.use('/api/v1/admin/solutions', solutionAdminRoutes);

// 14. Solutions public routes (no auth required)
app.use('/api/v1/solutions', solutionPublicRoutes);

// 15. Materials admin routes (admin only)
app.use('/api/v1/admin/materials', materialAdminRoutes);

// 16. Public materials by solution (no auth required)
app.use('/api/v1/solutions/:id/materials', materialPublicRoutes);

// 17. Material preview and download (mounted at /api/v1/materials)
app.use('/api/v1/materials', materialPreviewRoutes);

// 18. Knowledge admin routes (admin only)
app.use('/api/v1/admin/knowledge', knowledgeRoutes);

// 19. AI chat routes (authenticated users)
app.use('/api/v1/ai', aiChatRoutes);

// 20. Events routes (public, rate limited 30/min)
app.use('/api/v1/events', eventLimiter, eventsRoutes);

// 21. User admin routes (admin only)
app.use('/api/v1/admin/users', usersRoutes);

// 22. Leads admin routes (STAFF+ with dataScope)
app.use('/api/v1/admin/leads', leadsAdminRoutes);

// 23. Error handler (last)
app.use(errorHandler);

export default app;