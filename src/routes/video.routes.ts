import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';
import upload from '../middleware/upload';

const router = Router();

// Upload video
router.post('/upload', upload.single('video'), VideoController.uploadVideo);

// Get all videos
router.get('/', VideoController.getAllVideos);

// Get video by ID
router.get('/:id', VideoController.getVideoById);

// Delete video
router.delete('/:id', VideoController.deleteVideo);

export default router;
