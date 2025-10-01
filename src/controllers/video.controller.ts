import { Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import { TranscodeService } from '../services/transcode.service';
import { UsageService } from '../services/usage.service';

export class VideoController {
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

      // Start transcoding asynchronously (don't wait for it)
      TranscodeService.transcodeToMultipleResolutions(video.id, filePath)
        .catch(error => {
          console.error('Transcoding error:', error);
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
}
