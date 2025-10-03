# Quick Start - Using the SDK Without npm

## Option 1: Copy SDK Files (Simplest)

1. **Download the SDK files** from your dashboard or GitHub
2. **Copy to your project:**
   ```bash
   mkdir -p lib/video-processor
   cp -r sdk/src/* lib/video-processor/
   ```

3. **Install dependencies:**
   ```bash
   npm install axios form-data
   npm install --save-dev @types/node
   ```

4. **Use in your code:**
   ```typescript
   import VideoProcessorClient from './lib/video-processor';
   
   const client = new VideoProcessorClient({
     apiKey: 'your-api-key',
     baseURL: 'https://api.yoursite.com/api'
   });
   
   // Upload a video
   const result = await client.uploadVideo('./video.mp4');
   ```

## Option 2: Direct HTTP Requests (No SDK)

If you prefer not to use the SDK, you can make direct API calls:

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_KEY = 'your-api-key';
const BASE_URL = 'https://api.yoursite.com/api';

// Upload video
async function uploadVideo(filePath: string) {
  const formData = new FormData();
  formData.append('video', fs.createReadStream(filePath));
  
  const response = await axios.post(`${BASE_URL}/videos/upload`, formData, {
    headers: {
      'X-API-Key': API_KEY,
      ...formData.getHeaders()
    }
  });
  
  return response.data;
}

// List videos
async function listVideos() {
  const response = await axios.get(`${BASE_URL}/videos`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  return response.data.videos;
}

// Get usage
async function getUsage() {
  const response = await axios.get(`${BASE_URL}/usage`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  return response.data;
}

// Example usage
const result = await uploadVideo('./my-video.mp4');
console.log('Uploaded:', result.video.id);

const videos = await listVideos();
console.log('Total videos:', videos.length);

const usage = await getUsage();
console.log('Videos used:', usage.current.videosUploaded);
```

## Option 3: Install from GitHub

If your repo is on GitHub:

```bash
npm install github:yourusername/video-processor#main
```

Then import:
```typescript
import VideoProcessorClient from '@video-processor/sdk';
```

## API Endpoints Reference

All endpoints require the `X-API-Key` header:

```
POST   /api/videos/upload     - Upload video
GET    /api/videos            - List all videos
GET    /api/videos/:id        - Get video details
DELETE /api/videos/:id        - Delete video
GET    /api/usage             - Get usage stats
```

## Example: Express.js Integration

```typescript
import express from 'express';
import multer from 'multer';
import axios from 'axios';

const app = express();
const upload = multer({ dest: 'uploads/' });

const API_KEY = process.env.VIDEO_PROCESSOR_API_KEY;
const API_URL = 'https://api.yoursite.com/api';

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('video', fs.createReadStream(req.file.path));
    
    const result = await axios.post(`${API_URL}/videos/upload`, formData, {
      headers: {
        'X-API-Key': API_KEY,
        ...formData.getHeaders()
      }
    });
    
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Getting Your API Key

1. Log in to your Video Processor dashboard
2. Go to **API Keys** in the sidebar
3. Click **"Create New API Key"**
4. Copy and save your key securely
5. Use it in your code or `.env` file:
   ```
   VIDEO_PROCESSOR_API_KEY=your-key-here
   ```

## Need Help?

- Documentation: https://docs.yoursite.com
- Support: support@yoursite.com
- Dashboard: https://app.yoursite.com
