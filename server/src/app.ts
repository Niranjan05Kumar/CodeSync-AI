import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ApiError } from './utils/apiError';

export function createApp(): Express {
  const app = express();

  // Cross-Origin Resource Sharing
  app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

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
