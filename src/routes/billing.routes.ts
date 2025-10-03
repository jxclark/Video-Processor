import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticateJWT } from '../middleware/jwtAuth';
import { requireOwner } from '../middleware/rbac';
import express from 'express';

const router = Router();

// Webhook route (no auth, raw body needed)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  BillingController.handleWebhook
);

// All other routes require JWT authentication
router.use(authenticateJWT);

// Get all available plans (any authenticated user)
router.get('/plans', BillingController.getPlans);

// Get current plan
router.get('/current-plan', BillingController.getCurrentPlan);

// Get usage with limits
router.get('/usage', BillingController.getUsageWithLimits);

// Change plan (owner only)
router.post('/change-plan', requireOwner, BillingController.changePlan);

// Create Stripe checkout session (owner only)
router.post('/create-checkout', requireOwner, BillingController.createCheckoutSession);

// Create Stripe billing portal session (owner only)
router.post('/create-portal', requireOwner, BillingController.createPortalSession);

export default router;
