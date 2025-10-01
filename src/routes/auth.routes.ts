import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/jwtAuth';

const router = Router();

// Public routes
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateJWT, AuthController.me);

export default router;
