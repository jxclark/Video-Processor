import { Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';
import { TranscodeService } from '../services/transcode.service';
import { UsageService } from '../services/usage.service';
import { StreamingService } from '../services/streaming.service';

export class VideoController {
  // Process video: Generate thumbnail, HLS, and transcode
  private static async processVideo(videoId: string, filePath: string): Promise<void> {
    try {
      // Generate thumbnail
      const thumbnailPath = await StreamingService.generateThumbnail(videoId, filePath);
      
      // Get video metadata
      const metadata = await StreamingService.getVideoMetadata(filePath);
      
      // Generate HLS playlist (optional - can be heavy)
      // const hlsPath = await StreamingService.generateHLS(videoId, filePath);
      
      // Update video with streaming info
      await StreamingService.updateVideoStreamingInfo(
        videoId,
        '', // hlsPath - empty for now
        thumbnailPath,
        metadata
      );
      
      // Start transcoding
      await TranscodeService.transcodeToMultipleResolutions(videoId, filePath);
      
    } catch (error: any) {
      console.error('Process video error:', error);
      // Update video status to error
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'error',
          errorMessage: error.message
        }
      });
    }
  }

  // Upload video
  static async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { originalname, filename, path: filePath, size, mimetype } = req.file;

      // Check quota limits
      const canUpload = await UsageService.canUploadVideo(req.organizationId);
      if (!canUpload.allowed) {
        // Delete uploaded file since we're rejecting it
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.status(429).json({ error: canUpload.reason });
        return;
      }

      const hasStorage = await UsageService.hasStorageCapacity(req.organizationId, size);
      if (!hasStorage.allowed) {
        // Delete uploaded file since we're rejecting it
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.status(429).json({ error: hasStorage.reason });
        return;
      }

      // Create video record in database with organization
      const video = await prisma.video.create({
        data: {
          organizationId: req.organizationId,
          originalFilename: originalname,
          filePath: filePath,
          fileSize: BigInt(size),
          mimeType: mimetype,
          status: 'pending'
        }
      });

      // Track usage
      await UsageService.trackVideoUpload(req.organizationId, BigInt(size));

      // Start processing asynchronously (transcoding + thumbnail + HLS)
      this.processVideo(video.id, filePath).catch(error => {
        console.error('Video processing error:', error);
      });

      res.status(201).json({
        message: 'Video uploaded successfully and transcoding started',
        video: {
          id: video.id,
          originalFilename: video.originalFilename,
          status: video.status,
          createdAt: video.createdAt
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }

  // Get all videos
  static async getAllVideos(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      // Only get videos for this organization
      const videos = await prisma.video.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          transcodedVideos: true
        }
      });

      // Convert BigInt to string for JSON serialization
      const serializedVideos = videos.map(video => ({
        ...video,
        fileSize: video.fileSize.toString(),
        transcodedVideos: video.transcodedVideos.map(tv => ({
          ...tv,
          fileSize: tv.fileSize.toString()
        }))
      }));

      res.json({ videos: serializedVideos });
    } catch (error) {
      console.error('Get videos error:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  }

  // Get video by ID
  static async getVideoById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { id } = req.params;

      const video = await prisma.video.findFirst({
        where: { 
          id,
          organizationId: req.organizationId // Ensure video belongs to this org
        },
        include: {
          transcodedVideos: true
        }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Convert BigInt to string for JSON serialization
      const serializedVideo = {
        ...video,
        fileSize: video.fileSize.toString(),
        transcodedVideos: video.transcodedVideos.map(tv => ({
          ...tv,
          fileSize: tv.fileSize.toString()
        }))
      };

      res.json({ video: serializedVideo });
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({ error: 'Failed to fetch video' });
    }
  }

  // Delete video
  static async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { id } = req.params;

      const video = await prisma.video.findFirst({
        where: { 
          id,
          organizationId: req.organizationId // Ensure video belongs to this org
        },
        include: { transcodedVideos: true }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Calculate total storage to free
      let totalSize = video.fileSize;
      for (const transcoded of video.transcodedVideos) {
        totalSize += transcoded.fileSize;
      }

      // Delete original file
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }

      // Delete transcoded files
      for (const transcoded of video.transcodedVideos) {
        if (fs.existsSync(transcoded.filePath)) {
          fs.unlinkSync(transcoded.filePath);
        }
      }

      // Delete from database (cascade will delete transcoded videos)
      await prisma.video.delete({ where: { id } });

      // Track storage reduction
      await UsageService.trackVideoDeletion(req.organizationId, totalSize);

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }

  // Stream video (serve HLS playlist or video file)
  static async streamVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { id } = req.params;

      const video = await prisma.video.findFirst({
        where: { 
          id,
          organizationId: req.organizationId
        }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // If HLS playlist exists, serve it
      if (video.hlsPlaylistPath && fs.existsSync(video.hlsPlaylistPath)) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.sendFile(path.resolve(video.hlsPlaylistPath));
        return;
      }

      // Otherwise, serve original video file with range support
      const videoPath = video.filePath;
      if (!fs.existsSync(videoPath)) {
        res.status(404).json({ error: 'Video file not found' });
        return;
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mimeType || 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // No range, send entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType || 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('Stream video error:', error);
      res.status(500).json({ error: 'Failed to stream video' });
    }
  }

  // Get video thumbnail
  static async getThumbnail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { id } = req.params;

      const video = await prisma.video.findFirst({
        where: { 
          id,
          organizationId: req.organizationId
        }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (!video.thumbnailPath || !fs.existsSync(video.thumbnailPath)) {
        res.status(404).json({ error: 'Thumbnail not found' });
        return;
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.sendFile(path.resolve(video.thumbnailPath));
    } catch (error) {
      console.error('Get thumbnail error:', error);
      res.status(500).json({ error: 'Failed to get thumbnail' });
    }
  }

  // Download video
  static async downloadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const { id } = req.params;

      const video = await prisma.video.findFirst({
        where: { 
          id,
          organizationId: req.organizationId
        }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (!fs.existsSync(video.filePath)) {
        res.status(404).json({ error: 'Video file not found' });
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${video.originalFilename}"`);
      res.setHeader('Content-Type', video.mimeType || 'video/mp4');
      fs.createReadStream(video.filePath).pipe(res);
    } catch (error) {
      console.error('Download video error:', error);
      res.status(500).json({ error: 'Failed to download video' });
    }
  }
}
