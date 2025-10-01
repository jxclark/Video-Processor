import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { UsageService } from './usage.service';

// Ensure output directory exists
const outputDir = process.env.OUTPUT_DIR || './outputs';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface TranscodeOptions {
  videoId: string;
  inputPath: string;
  resolution: '720p' | '1080p';
}

interface TranscodeResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number;
  error?: string;
}

export class TranscodeService {
  // Get video metadata
  static getVideoMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  // Transcode video to specific resolution
  static async transcodeVideo(options: TranscodeOptions): Promise<TranscodeResult> {
    const { videoId, inputPath, resolution } = options;

    try {
      // Generate output filename
      const ext = path.extname(inputPath);
      const outputFilename = `${videoId}-${resolution}${ext}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Resolution settings
      const resolutionMap = {
        '720p': { width: 1280, height: 720, bitrate: '2500k' },
        '1080p': { width: 1920, height: 1080, bitrate: '5000k' }
      };

      const settings = resolutionMap[resolution];

      // Update status to processing
      await prisma.transcodedVideo.upsert({
        where: {
          videoId_resolution: {
            videoId,
            resolution
          }
        },
        update: {
          status: 'processing'
        },
        create: {
          videoId,
          resolution,
          filePath: outputPath,
          fileSize: BigInt(0),
          status: 'processing'
        }
      });

      // Perform transcoding
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${settings.width}x${settings.height}`)
          .videoBitrate(settings.bitrate)
          .audioBitrate('128k')
          .on('start', (commandLine) => {
            console.log(`🎬 Transcoding to ${resolution}: ${commandLine}`);
          })
          .on('progress', (progress) => {
            console.log(`⏳ ${resolution} Progress: ${progress.percent?.toFixed(2)}%`);
          })
          .on('end', () => {
            console.log(`✅ ${resolution} transcoding completed`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`❌ ${resolution} transcoding error:`, err);
            reject(err);
          })
          .run();
      });

      // Get file size
      const stats = fs.statSync(outputPath);
      const fileSize = stats.size;

      // Update database with success
      await prisma.transcodedVideo.update({
        where: {
          videoId_resolution: {
            videoId,
            resolution
          }
        },
        data: {
          fileSize: BigInt(fileSize),
          codec: 'libx264',
          bitrate: parseInt(settings.bitrate),
          status: 'completed'
        }
      });

      return {
        success: true,
        outputPath,
        fileSize
      };
    } catch (error) {
      // Update database with error
      await prisma.transcodedVideo.update({
        where: {
          videoId_resolution: {
            videoId,
            resolution
          }
        },
        data: {
          status: 'failed'
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Transcode to multiple resolutions
  static async transcodeToMultipleResolutions(videoId: string, inputPath: string): Promise<void> {
    try {
      // Update original video status
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'processing' }
      });

      // Get video metadata and update duration
      const metadata = await this.getVideoMetadata(inputPath);
      const duration = metadata.format.duration || 0;

      await prisma.video.update({
        where: { id: videoId },
        data: { duration }
      });

      // Get video to access organizationId
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      // Track minutes processed
      await UsageService.trackVideoUpload(video.organizationId, BigInt(0), duration);

      // Transcode to both resolutions
      const resolutions: Array<'720p' | '1080p'> = ['720p', '1080p'];
      
      for (const resolution of resolutions) {
        await this.transcodeVideo({
          videoId,
          inputPath,
          resolution
        });
      }

      // Update original video status to completed
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'completed' }
      });

      console.log(`✅ All transcoding completed for video: ${videoId}`);
    } catch (error) {
      // Update video status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      console.error(`❌ Transcoding failed for video: ${videoId}`, error);
    }
  }
}
