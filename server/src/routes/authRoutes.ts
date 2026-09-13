import { Router } from 'express';
import { register, login, refresh, getMe } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validations/authValidation';

import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), register);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refresh);
router.get('/me', authenticateToken, getMe);

export default router;
