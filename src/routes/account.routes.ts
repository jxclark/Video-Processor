import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticateJWT } from '../middleware/jwtAuth';
import { requireOwner } from '../middleware/rbac';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJWT);

// User profile management
router.patch('/profile', AccountController.updateProfile);
router.patch('/password', AccountController.changePassword);
router.get('/activity', AccountController.getMyActivity);

// Organization settings
router.get('/organization', AccountController.getOrganizationSettings);
router.patch('/organization', requireOwner, AccountController.updateOrganizationSettings);

export default router;
