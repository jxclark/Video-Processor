import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

// All routes require API key authentication
router.use(authenticateApiKey);

// Get usage statistics
router.get('/stats', UsageController.getUsageStats);

export default router;
