/**
 * Express.js Integration Example
 * 
 * This example shows how to integrate the Video Processor SDK into an Express.js web application
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import VideoProcessorClient, { VideoProcessorError } from '../src/index';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize Video Processor client
const videoClient = new VideoProcessorClient({
  apiKey: process.env.VIDEO_PROCESSOR_API_KEY!,
  baseURL: process.env.VIDEO_PROCESSOR_BASE_URL
});

// Middleware to check API connection
app.use(async (req, res, next) => {
  // You might want to cache this check
  const { success } = await videoClient.testConnection();
  if (!success) {
    return res.status(503).json({ error: 'Video processing service unavailable' });
  }
  next();
});

/**
 * Upload video endpoint
 * POST /api/videos/upload
 */
app.post('/api/videos/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Check limits before uploading
    const { withinLimits, warnings } = await videoClient.checkLimits();
    if (!withinLimits) {
      return res.status(429).json({ 
        error: 'Upload limit exceeded', 
        warnings 
      });
    }

    // Upload to Video Processor
    const result = await videoClient.uploadVideo(req.file.path, {
      metadata: {
        title: req.body.title || req.file.originalname,
        description: req.body.description,
        // Add user ID if you have authentication middleware
        // userId: (req as any).user?.id
      }
    });

    res.json({
      success: true,
      video: result.video
    });

  } catch (error) {
    if (error instanceof VideoProcessorError) {
      res.status(error.statusCode || 500).json({
        error: error.message
      });
    } else {
      res.status(500).json({ error: 'Upload failed' });
    }
  }
});

/**
 * List videos endpoint
 * GET /api/videos
 */
app.get('/api/videos', async (req: Request, res: Response) => {
  try {
    const { videos } = await videoClient.listVideos();
    res.json({ videos });
  } catch (error) {
    if (error instanceof VideoProcessorError) {
      res.status(error.statusCode || 500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  }
});

/**
 * Get video details endpoint
 * GET /api/videos/:id
 */
app.get('/api/videos/:id', async (req: Request, res: Response) => {
  try {
    const { video } = await videoClient.getVideo(req.params.id);
    res.json({ video });
  } catch (error) {
    if (error instanceof VideoProcessorError) {
      res.status(error.statusCode || 500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch video' });
    }
  }
});

/**
 * Delete video endpoint
 * DELETE /api/videos/:id
 */
app.delete('/api/videos/:id', async (req: Request, res: Response) => {
  try {
    const result = await videoClient.deleteVideo(req.params.id);
    res.json(result);
  } catch (error) {
    if (error instanceof VideoProcessorError) {
      res.status(error.statusCode || 500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }
});

/**
 * Get usage stats endpoint
 * GET /api/usage
 */
app.get('/api/usage', async (req: Request, res: Response) => {
  try {
    const usage = await videoClient.getUsage();
    res.json({ usage });
  } catch (error) {
    if (error instanceof VideoProcessorError) {
      res.status(error.statusCode || 500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', async (req: Request, res: Response) => {
  const { success, message } = await videoClient.testConnection();
  res.json({
    status: success ? 'ok' : 'error',
    videoProcessor: success ? 'connected' : 'disconnected',
    message
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📹 Video Processor SDK integrated`);
});
