import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config';
import { helmetMiddleware } from './middleware/helmet';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { authLimiter } from './middleware/rateLimit';
import authRoutes from './modules/auth/auth.routes';
import auditRoutes from './modules/audit/audit.routes';
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

// 10. Error handler (last)
app.use(errorHandler);

export default app;