import { Router } from 'express';
import { register, login, refresh, getMe } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validations/authValidation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refresh);
router.get('/me', authenticateToken, getMe);

export default router;
