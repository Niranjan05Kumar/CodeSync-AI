import { Router } from 'express';
import { ragController } from '../controllers/ragController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { ragSyncSchema, ragQuerySchema } from '../validations/ragValidation';

export const ragRouter = Router();

// Require authentication for all RAG endpoints
ragRouter.use(authenticateToken);

// POST /api/v1/rag/sync
ragRouter.post('/sync', validateBody(ragSyncSchema), ragController.sync);

// POST /api/v1/rag/query
ragRouter.post('/query', validateBody(ragQuerySchema), ragController.query);
