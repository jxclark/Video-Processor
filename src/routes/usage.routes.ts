import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller';
import { authenticateJWT } from '../middleware/jwtAuth';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJWT);

// Get usage statistics
router.get('/stats', UsageController.getUsageStats);

export default router;
