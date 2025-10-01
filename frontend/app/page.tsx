'use client';

import { useState, useEffect } from 'react';
import UploadSection from '@/components/UploadSection';
import VideoList from '@/components/VideoList';
import { videoApi } from '@/services/api';

interface TranscodedVideo {
  id: string;
  resolution: string;
  fileSize: string;
  status: string;
  createdAt: string;
}

interface Video {
  id: string;
  originalFilename: string;
  fileSize: string;
  status: string;
  duration: number | null;
  createdAt: string;
  transcodedVideos: TranscodedVideo[];
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch videos
  const fetchVideos = async () => {
    try {
      const data = await videoApi.getAllVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Poll every 5 seconds to check for status updates
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await videoApi.uploadVideo(file);
      fetchVideos();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await videoApi.deleteVideo(id);
      fetchVideos();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video');
    }
  };

  return (
    <div className="space-y-8">
      <UploadSection onUpload={handleUpload} uploading={uploading} />
      <VideoList videos={videos} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
