import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';

export class StreamingService {
  /**
   * Generate HLS playlist and segments for adaptive streaming
   */
  static async generateHLS(videoId: string, inputPath: string): Promise<string> {
    try {
      // Create HLS output directory
      const hlsDir = path.join('uploads', 'hls', videoId);
      if (!fs.existsSync(hlsDir)) {
        fs.mkdirSync(hlsDir, { recursive: true });
      }

      const playlistPath = path.join(hlsDir, 'playlist.m3u8');

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-codec: copy',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls'
          ])
          .output(playlistPath)
          .on('end', () => {
            console.log('HLS generation completed');
            resolve(playlistPath);
          })
          .on('error', (err) => {
            console.error('HLS generation error:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      console.error('Generate HLS error:', error);
      throw error;
    }
  }

  /**
   * Generate video thumbnail at specific timestamp
   */
  static async generateThumbnail(
    videoId: string, 
    inputPath: string, 
    timestamp: string = '00:00:01'
  ): Promise<string> {
    try {
      const thumbnailDir = path.join('uploads', 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [timestamp],
            filename: `${videoId}.jpg`,
            folder: thumbnailDir,
            size: '1280x720'
          })
          .on('end', () => {
            console.log('Thumbnail generated');
            resolve(thumbnailPath);
          })
          .on('error', (err) => {
            console.error('Thumbnail generation error:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('Generate thumbnail error:', error);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnails (for preview/scrubbing)
   */
  static async generateMultipleThumbnails(
    videoId: string,
    inputPath: string,
    count: number = 10
  ): Promise<string[]> {
    try {
      const thumbnailDir = path.join('uploads', 'thumbnails', videoId);
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Get video duration first
      const duration = await this.getVideoDuration(inputPath);
      const interval = duration / (count + 1);
      const timestamps: string[] = [];

      for (let i = 1; i <= count; i++) {
        const seconds = Math.floor(interval * i);
        timestamps.push(this.secondsToTimestamp(seconds));
      }

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps,
            filename: 'thumb-%i.jpg',
            folder: thumbnailDir,
            size: '320x180'
          })
          .on('end', () => {
            const thumbnailPaths = timestamps.map((_, i) => 
              path.join(thumbnailDir, `thumb-${i + 1}.jpg`)
            );
            resolve(thumbnailPaths);
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error('Generate multiple thumbnails error:', error);
      throw error;
    }
  }

  /**
   * Get video duration in seconds
   */
  static async getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  /**
   * Get video metadata
   */
  static async getVideoMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            format: metadata.format.format_name,
            videoCodec: metadata.streams.find(s => s.codec_type === 'video')?.codec_name,
            audioCodec: metadata.streams.find(s => s.codec_type === 'audio')?.codec_name,
            width: metadata.streams.find(s => s.codec_type === 'video')?.width,
            height: metadata.streams.find(s => s.codec_type === 'video')?.height,
            fps: metadata.streams.find(s => s.codec_type === 'video')?.r_frame_rate
          });
        }
      });
    });
  }

  /**
   * Update video with streaming URLs and thumbnail
   */
  static async updateVideoStreamingInfo(
    videoId: string,
    hlsPath: string,
    thumbnailPath: string,
    metadata: any
  ): Promise<void> {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        hlsPlaylistPath: hlsPath,
        thumbnailPath: thumbnailPath,
        duration: metadata.duration ? Math.floor(metadata.duration) : null,
        width: metadata.width,
        height: metadata.height,
        status: 'completed'
      }
    });
  }

  /**
   * Helper: Convert seconds to HH:MM:SS format
   */
  private static secondsToTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate signed URL for private video streaming (future feature)
   */
  static generateSignedUrl(videoId: string, expiresIn: number = 3600): string {
    // TODO: Implement signed URLs with expiration
    // For now, return public URL
    return `/api/videos/${videoId}/stream`;
  }
}
