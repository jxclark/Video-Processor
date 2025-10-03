import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';
import upload from '../middleware/upload';
import { authenticateJWT } from '../middleware/jwtAuth';

const router = Router();

// All routes require JWT authentication (user dashboard access)
router.use(authenticateJWT);

// Upload video
router.post('/upload', upload.single('video'), VideoController.uploadVideo);

// Get all videos
router.get('/', VideoController.getAllVideos);

// Get video by ID
router.get('/:id', VideoController.getVideoById);

// Delete video
router.delete('/:id', VideoController.deleteVideo);

// Stream video (HLS playlist)
router.get('/:id/stream', VideoController.streamVideo);

// Get video thumbnail
router.get('/:id/thumbnail', VideoController.getThumbnail);

// Download video
router.get('/:id/download', VideoController.downloadVideo);

export default router;
