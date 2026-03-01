import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';

import { env } from './lib/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/requestId';
import { errorHandler, notFound } from './middleware/errorHandler';

import { authRouter } from './routes/auth';
import { botsRouter } from './routes/bots';
import { servicesRouter } from './routes/services';
import { adminRouter } from './routes/admin';
import healthRouter from './routes/health';
import chatRouter from './routes/chat';
import callsRouter from './routes/calls';
import botScriptsRouter from './routes/bot-scripts';

export function createApp() {
  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // ─── Parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Request Enrichment ─────────────────────────────────────────────────
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.requestId }),
      // Don't log health-check noise
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  // ─── Rate Limiting ──────────────────────────────────────────────────────
  const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // stricter for auth endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
  });

  app.use(defaultLimiter);

  // ─── API Documentation ──────────────────────────────────────────────────
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lido API Docs',
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ─── Health Check ───────────────────────────────────────────────────────
  app.use(healthRouter);

  // ─── Routes ─────────────────────────────────────────────────────────────
  app.use('/auth', authLimiter, authRouter);
  app.use('/bots', botsRouter);
  app.use('/services', servicesRouter);
  app.use('/admin', adminRouter);
  app.use('/chat', chatRouter);
  app.use('/calls', callsRouter);
  app.use('/bot-scripts', botScriptsRouter);

  // ─── Error Handling ─────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
