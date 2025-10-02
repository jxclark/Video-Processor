import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticateJWT } from '../middleware/jwtAuth';
import { requireOwner } from '../middleware/rbac';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJWT);

// Get all available plans (any authenticated user)
router.get('/plans', BillingController.getPlans);

// Get current plan
router.get('/current-plan', BillingController.getCurrentPlan);

// Get usage with limits
router.get('/usage', BillingController.getUsageWithLimits);

// Change plan (owner only)
router.post('/change-plan', requireOwner, BillingController.changePlan);

export default router;
