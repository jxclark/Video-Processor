# Video Processor SDK

Official Node.js SDK for the Video Processor API. Process, transcode, and manage videos programmatically.

## Installation

```bash
npm install @video-processor/sdk
```

## Quick Start

```typescript
import VideoProcessorClient from '@video-processor/sdk';

// Initialize the client with your API key
const client = new VideoProcessorClient({
  apiKey: 'your-api-key-here',
  baseURL: 'https://api.videoprocessor.com/api' // Optional, defaults to localhost
});

// Upload a video
const result = await client.uploadVideo('./path/to/video.mp4');
console.log('Video uploaded:', result.video.id);
```

## Getting Your API Key

1. Log in to your Video Processor dashboard
2. Navigate to **API Keys** in the sidebar
3. Click **"Create New API Key"**
4. Copy your API key and keep it secure

## API Reference

### Initialize Client

```typescript
const client = new VideoProcessorClient({
  apiKey: 'your-api-key-here',
  baseURL: 'https://api.videoprocessor.com/api' // Optional
});
```

### Upload Video

Upload a video file for processing:

```typescript
const result = await client.uploadVideo('./video.mp4', {
  metadata: {
    title: 'My Video',
    description: 'Video description',
    tags: ['tutorial', 'demo']
  }
});

console.log('Video ID:', result.video.id);
console.log('Status:', result.video.status);
```

### List All Videos

Get all videos in your account:

```typescript
const { videos } = await client.listVideos();

videos.forEach(video => {
  console.log(`${video.originalName} - ${video.status}`);
});
```

### Get Video Details

Get details of a specific video:

```typescript
const { video } = await client.getVideo('video-id-here');

console.log('Filename:', video.filename);
console.log('Duration:', video.duration);
console.log('Size:', video.size);
console.log('Status:', video.status);
```

### Delete Video

Delete a video:

```typescript
const result = await client.deleteVideo('video-id-here');
console.log(result.message); // "Video deleted successfully"
```

### Get Usage Statistics

Check your current usage and limits:

```typescript
const usage = await client.getUsage();

console.log('Plan:', usage.plan);
console.log('Videos uploaded:', usage.current.videosUploaded);
console.log('Video limit:', usage.limits.videosPerMonth);
console.log('Storage used:', usage.current.storageUsedGB, 'GB');
console.log('Storage limit:', usage.limits.storageGB, 'GB');
```

### Check Limits

Check if you're within your plan limits:

```typescript
const { withinLimits, usage, warnings } = await client.checkLimits();

if (!withinLimits) {
  console.log('⚠️ Limits exceeded:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
} else {
  console.log('✅ All limits OK');
}
```

### Test Connection

Test if your API key is valid:

```typescript
const { success, message } = await client.testConnection();

if (success) {
  console.log('✅ Connected successfully');
} else {
  console.error('❌ Connection failed:', message);
}
```

## Complete Example

```typescript
import VideoProcessorClient from '@video-processor/sdk';
import * as path from 'path';

async function main() {
  // Initialize client
  const client = new VideoProcessorClient({
    apiKey: process.env.VIDEO_PROCESSOR_API_KEY!,
    baseURL: 'https://api.videoprocessor.com/api'
  });

  try {
    // Test connection
    console.log('Testing connection...');
    const { success } = await client.testConnection();
    if (!success) {
      throw new Error('Connection failed');
    }
    console.log('✅ Connected\n');

    // Check limits before uploading
    console.log('Checking limits...');
    const { withinLimits, warnings } = await client.checkLimits();
    if (!withinLimits) {
      console.warn('⚠️ Warning: Some limits exceeded');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }
    console.log('');

    // Upload video
    console.log('Uploading video...');
    const videoPath = path.join(__dirname, 'sample-video.mp4');
    const uploadResult = await client.uploadVideo(videoPath, {
      metadata: {
        title: 'Sample Video',
        category: 'tutorial'
      }
    });
    console.log('✅ Video uploaded:', uploadResult.video.id);
    console.log('   Status:', uploadResult.video.status);
    console.log('   Size:', (uploadResult.video.size / 1024 / 1024).toFixed(2), 'MB\n');

    // List all videos
    console.log('Fetching all videos...');
    const { videos } = await client.listVideos();
    console.log(`Found ${videos.length} videos:\n`);
    
    videos.slice(0, 5).forEach(video => {
      console.log(`  - ${video.originalName}`);
      console.log(`    ID: ${video.id}`);
      console.log(`    Status: ${video.status}`);
      console.log(`    Uploaded: ${new Date(video.uploadedAt).toLocaleDateString()}\n`);
    });

    // Get usage stats
    console.log('Current usage:');
    const usage = await client.getUsage();
    console.log(`  Plan: ${usage.plan}`);
    console.log(`  Videos: ${usage.current.videosUploaded} / ${usage.limits.videosPerMonth === -1 ? 'Unlimited' : usage.limits.videosPerMonth}`);
    console.log(`  Storage: ${usage.current.storageUsedGB.toFixed(2)} GB / ${usage.limits.storageGB} GB`);
    console.log(`  API Calls: ${usage.current.apiCalls} / ${usage.limits.apiCallsPerMonth === -1 ? 'Unlimited' : usage.limits.apiCallsPerMonth}`);

  } catch (error) {
    if (error instanceof VideoProcessorError) {
      console.error('❌ API Error:', error.message);
      console.error('   Status:', error.statusCode);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

main();
```

## Error Handling

The SDK throws `VideoProcessorError` for API errors:

```typescript
import { VideoProcessorError } from '@video-processor/sdk';

try {
  await client.uploadVideo('./video.mp4');
} catch (error) {
  if (error instanceof VideoProcessorError) {
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Response:', error.response);
    
    // Handle specific errors
    if (error.statusCode === 429) {
      console.error('Rate limit exceeded. Please wait before retrying.');
    } else if (error.statusCode === 403) {
      console.error('Invalid API key or insufficient permissions.');
    } else if (error.statusCode === 413) {
      console.error('File too large for your plan.');
    }
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import VideoProcessorClient, { 
  Video, 
  UsageStats, 
  VideoProcessorError 
} from '@video-processor/sdk';

const client: VideoProcessorClient = new VideoProcessorClient({
  apiKey: 'your-key'
});

const video: Video = await client.getVideo('video-id');
const usage: UsageStats = await client.getUsage();
```

## Environment Variables

Store your API key securely using environment variables:

```bash
# .env
VIDEO_PROCESSOR_API_KEY=your-api-key-here
VIDEO_PROCESSOR_BASE_URL=https://api.videoprocessor.com/api
```

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const client = new VideoProcessorClient({
  apiKey: process.env.VIDEO_PROCESSOR_API_KEY!,
  baseURL: process.env.VIDEO_PROCESSOR_BASE_URL
});
```

## Rate Limiting

The API has rate limits based on your plan:

- **Free**: 10 requests/minute
- **Starter**: 30 requests/minute
- **Pro**: 100 requests/minute
- **Enterprise**: 500 requests/minute

When you hit the rate limit, you'll receive a `429` error. The SDK will include retry-after information in the error response.

## Support

- **Documentation**: https://docs.videoprocessor.com
- **Dashboard**: https://app.videoprocessor.com
- **Support**: support@videoprocessor.com

## License

MIT
