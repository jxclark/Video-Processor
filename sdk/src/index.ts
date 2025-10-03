import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

export interface VideoProcessorConfig {
  apiKey: string;
  baseURL?: string;
}

export interface Video {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  duration: number | null;
  status: string;
  uploadedAt: string;
}

export interface UploadResponse {
  message: string;
  video: Video;
}

export interface UsageStats {
  current: {
    videosUploaded: number;
    minutesProcessed: number;
    storageUsedGB: number;
    apiCalls: number;
  };
  limits: {
    videosPerMonth: number;
    minutesPerMonth: number;
    storageGB: number;
    apiCallsPerMonth: number;
  };
  plan: string;
  month: string;
}

export class VideoProcessorError extends Error {
  public statusCode?: number;
  public response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = 'VideoProcessorError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class VideoProcessorClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: VideoProcessorConfig) {
    this.apiKey = config.apiKey;
    
    this.client = axios.create({
      baseURL: config.baseURL || 'http://localhost:3000/api',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: AxiosError<any>) => {
        const message = error.response?.data?.error || error.message;
        const statusCode = error.response?.status;
        throw new VideoProcessorError(message, statusCode, error.response?.data);
      }
    );
  }

  /**
   * Upload a video file for processing
   * @param filePath - Path to the video file
   * @param options - Optional metadata
   */
  async uploadVideo(filePath: string, options?: { metadata?: Record<string, any> }): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('video', fs.createReadStream(filePath));
      
      if (options?.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      const response = await this.client.post('/videos/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': this.apiKey
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all videos
   */
  async listVideos(): Promise<{ videos: Video[] }> {
    const response = await this.client.get('/videos');
    return response.data;
  }

  /**
   * Get a specific video by ID
   */
  async getVideo(videoId: string): Promise<{ video: Video }> {
    const response = await this.client.get(`/videos/${videoId}`);
    return response.data;
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/videos/${videoId}`);
    return response.data;
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await this.client.get('/usage');
    return response.data;
  }

  /**
   * Check if usage limit has been reached
   */
  async checkLimits(): Promise<{
    withinLimits: boolean;
    usage: UsageStats;
    warnings: string[];
  }> {
    const usage = await this.getUsage();
    const warnings: string[] = [];
    let withinLimits = true;

    // Check video limit
    if (usage.limits.videosPerMonth !== -1 && 
        usage.current.videosUploaded >= usage.limits.videosPerMonth) {
      withinLimits = false;
      warnings.push('Video upload limit reached');
    }

    // Check minutes limit
    if (usage.limits.minutesPerMonth !== -1 && 
        usage.current.minutesProcessed >= usage.limits.minutesPerMonth) {
      withinLimits = false;
      warnings.push('Processing minutes limit reached');
    }

    // Check storage limit
    if (usage.current.storageUsedGB >= usage.limits.storageGB) {
      withinLimits = false;
      warnings.push('Storage limit reached');
    }

    // Check API calls limit
    if (usage.limits.apiCallsPerMonth !== -1 && 
        usage.current.apiCalls >= usage.limits.apiCallsPerMonth) {
      withinLimits = false;
      warnings.push('API calls limit reached');
    }

    return { withinLimits, usage, warnings };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.get('/videos');
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      if (error instanceof VideoProcessorError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Connection failed' };
    }
  }
}

// Export everything
export default VideoProcessorClient;
