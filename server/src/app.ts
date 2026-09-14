import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ApiError } from './utils/apiError';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { checkDatabaseHealth } from './db/pool';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (Render, Vercel, Railway, Nginx) for accurate IP resolution in rate limiting
  app.set('trust proxy', 1);

  // Helmet HTTP Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Managed at client/edge level for Monaco Web Workers
  }));

  // Cross-Origin Resource Sharing (CORS) Lockdown
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow matching origins, wildcard, development, or any Vercel deployment domain
      if (
        allowedOrigins.includes(origin) || 
        allowedOrigins.includes('*') || 
        process.env.NODE_ENV === 'development' ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin '${origin}' not allowed by policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Global Rate Limiter applied to all /api endpoints
  app.use('/api', globalRateLimiter);

  // Body parsing middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic request logger in development
  if (process.env.NODE_ENV !== 'test') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const now = new Date().toISOString().slice(11, 19);
      console.log(`[${now}] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // Mount top-level health checks for cloud deployment platforms (Render, AWS, K8s)
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.ok;
    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'UP' : 'DEGRADED',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbHealth.ok ? 'connected' : 'disconnected'
    });
  });

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Catch-all route for unknown API endpoints
  app.use('*', (req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`, 'ENDPOINT_NOT_FOUND'));
  });

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
