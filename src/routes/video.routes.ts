import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';
import upload from '../middleware/upload';
import { authenticateApiKey, requirePermission } from '../middleware/auth';

const router = Router();

// All routes require API key authentication
router.use(authenticateApiKey);

// Upload video (requires video:write permission)
router.post('/upload', requirePermission('video:write'), upload.single('video'), VideoController.uploadVideo);

// Get all videos (requires video:read permission)
router.get('/', requirePermission('video:read'), VideoController.getAllVideos);

// Get video by ID (requires video:read permission)
router.get('/:id', requirePermission('video:read'), VideoController.getVideoById);

// Delete video (requires video:write permission)
router.delete('/:id', requirePermission('video:write'), VideoController.deleteVideo);

export default router;
