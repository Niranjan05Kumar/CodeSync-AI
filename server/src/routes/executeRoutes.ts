import { Router } from 'express';
import { executionController } from '../controllers/executionController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { executeCodeSchema } from '../validations/executionValidation';

export const executeRouter = Router();

// POST /api/v1/execute
executeRouter.post(
  '/',
  authenticateToken,
  validateBody(executeCodeSchema),
  executionController.execute
);
