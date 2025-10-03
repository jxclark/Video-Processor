/**
 * Basic Usage Example
 * 
 * This example shows how to use the Video Processor SDK in a typical Node.js application
 */

import VideoProcessorClient, { VideoProcessorError } from '../src/index';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function basicExample() {
  // Initialize the client
  const client = new VideoProcessorClient({
    apiKey: process.env.VIDEO_PROCESSOR_API_KEY || 'your-api-key-here',
    baseURL: process.env.VIDEO_PROCESSOR_BASE_URL || 'http://localhost:3000/api'
  });

  console.log('🎬 Video Processor SDK - Basic Usage Example\n');

  try {
    // 1. Test connection
    console.log('1️⃣  Testing API connection...');
    const { success, message } = await client.testConnection();
    if (!success) {
      throw new Error(`Connection failed: ${message}`);
    }
    console.log('   ✅ Connected successfully\n');

    // 2. Check current usage
    console.log('2️⃣  Checking current usage...');
    const usage = await client.getUsage();
    console.log(`   📊 Plan: ${usage.plan.toUpperCase()}`);
    console.log(`   📹 Videos: ${usage.current.videosUploaded} / ${usage.limits.videosPerMonth === -1 ? '∞' : usage.limits.videosPerMonth}`);
    console.log(`   💾 Storage: ${usage.current.storageUsedGB.toFixed(2)} GB / ${usage.limits.storageGB} GB`);
    console.log(`   🔌 API Calls: ${usage.current.apiCalls} / ${usage.limits.apiCallsPerMonth === -1 ? '∞' : usage.limits.apiCallsPerMonth}\n`);

    // 3. Check limits
    console.log('3️⃣  Checking plan limits...');
    const { withinLimits, warnings } = await client.checkLimits();
    if (withinLimits) {
      console.log('   ✅ All limits OK\n');
    } else {
      console.log('   ⚠️  Some limits exceeded:');
      warnings.forEach(warning => console.log(`      - ${warning}`));
      console.log('');
    }

    // 4. Upload a video
    console.log('4️⃣  Uploading video...');
    const videoPath = path.join(__dirname, 'sample-video.mp4');
    
    // Check if file exists (in real app)
    // if (!fs.existsSync(videoPath)) {
    //   console.log('   ⚠️  Sample video not found. Skipping upload.');
    //   console.log('      Place a video at:', videoPath);
    // } else {
      const uploadResult = await client.uploadVideo(videoPath, {
        metadata: {
          title: 'SDK Test Video',
          description: 'Uploaded via SDK',
          tags: ['test', 'sdk']
        }
      });
      console.log('   ✅ Video uploaded successfully');
      console.log(`      ID: ${uploadResult.video.id}`);
      console.log(`      Status: ${uploadResult.video.status}`);
      console.log(`      Size: ${(uploadResult.video.size / 1024 / 1024).toFixed(2)} MB\n`);
    // }

    // 5. List all videos
    console.log('5️⃣  Fetching all videos...');
    const { videos } = await client.listVideos();
    console.log(`   Found ${videos.length} video(s):\n`);
    
    videos.slice(0, 3).forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.originalName}`);
      console.log(`      ID: ${video.id}`);
      console.log(`      Status: ${video.status}`);
      console.log(`      Uploaded: ${new Date(video.uploadedAt).toLocaleString()}`);
      console.log('');
    });

    // 6. Get specific video details
    if (videos.length > 0) {
      console.log('6️⃣  Getting video details...');
      const { video } = await client.getVideo(videos[0].id);
      console.log(`   📹 ${video.originalName}`);
      console.log(`      Filename: ${video.filename}`);
      console.log(`      Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`      Duration: ${video.duration ? `${video.duration}s` : 'Processing...'}`);
      console.log(`      Status: ${video.status}\n`);
    }

    console.log('✅ Example completed successfully!');

  } catch (error) {
    if (error instanceof VideoProcessorError) {
      console.error('\n❌ API Error:');
      console.error(`   Status: ${error.statusCode}`);
      console.error(`   Message: ${error.message}`);
      
      // Handle specific errors
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.error('\n💡 Tip: Check your API key in the .env file');
      } else if (error.statusCode === 429) {
        console.error('\n💡 Tip: You hit the rate limit. Wait a minute and try again.');
      } else if (error.statusCode === 413) {
        console.error('\n💡 Tip: File too large for your plan. Upgrade or use a smaller file.');
      }
    } else {
      console.error('\n❌ Error:', error);
    }
    process.exit(1);
  }
}

// Run the example
basicExample();
