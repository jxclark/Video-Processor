import { Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import { TranscodeService } from '../services/transcode.service';

export class VideoController {
  // Upload video
  static async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { originalname, filename, path: filePath, size, mimetype } = req.file;

      // Create video record in database
      const video = await prisma.video.create({
        data: {
          originalFilename: originalname,
          filePath: filePath,
          fileSize: BigInt(size),
          mimeType: mimetype,
          status: 'pending'
        }
      });

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
      const videos = await prisma.video.findMany({
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
      const { id } = req.params;

      const video = await prisma.video.findUnique({
        where: { id },
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
      const { id } = req.params;

      const video = await prisma.video.findUnique({
        where: { id },
        include: { transcodedVideos: true }
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
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

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }
}
