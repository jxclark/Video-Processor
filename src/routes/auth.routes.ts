import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticateJWT } from '../middleware/jwtAuth';

const router = Router();

// Public routes with strict rate limiting
router.post('/signup', authRateLimiter, AuthController.signup);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);

// Protected routes
router.get('/me', authenticateJWT, AuthController.me);
router.post('/resend-verification', authenticateJWT, AuthController.resendVerification);

export default router;
