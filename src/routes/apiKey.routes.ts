import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { authenticateJWT } from '../middleware/jwtAuth';

const router = Router();

// All routes require JWT authentication (user must be logged in)
router.use(authenticateJWT);

// Get all API keys for the organization
router.get('/', ApiKeyController.getAllKeys);

// Create a new API key
router.post('/', ApiKeyController.createKey);

// Revoke an API key
router.patch('/:id/revoke', ApiKeyController.revokeKey);

// Reactivate an API key
router.patch('/:id/reactivate', ApiKeyController.reactivateKey);

// Delete an API key
router.delete('/:id', ApiKeyController.deleteKey);

export default router;
