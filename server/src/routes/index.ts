import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';
import { checkDatabaseHealth } from '../db/pool';

import { executeRouter } from './executeRoutes';
import { aiRouter } from './aiRoutes';
import { ragRouter } from './ragRoutes';

const router = Router();

// API Health Check
router.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.ok;

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbHealth
    }
  });
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/execute', executeRouter);
router.use('/ai', aiRouter);
router.use('/rag', ragRouter);

export default router;
