import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import {
  reviewCodeSchema,
  debugCodeSchema,
  explainCodeSchema,
  chatCodeSchema
} from '../validations/aiValidation';

export const aiRouter = Router();

// Require authentication for all AI routes
aiRouter.use(authenticateToken);

// POST /api/v1/ai/review
aiRouter.post('/review', validateBody(reviewCodeSchema), aiController.review);

// POST /api/v1/ai/debug
aiRouter.post('/debug', validateBody(debugCodeSchema), aiController.debug);

// POST /api/v1/ai/explain
aiRouter.post('/explain', validateBody(explainCodeSchema), aiController.explain);

// POST /api/v1/ai/chat
aiRouter.post('/chat', validateBody(chatCodeSchema), aiController.chat);
