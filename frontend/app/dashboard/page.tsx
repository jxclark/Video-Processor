'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UploadSection from '@/components/UploadSection';
import VideoList from '@/components/VideoList';
import UsageStats from '@/components/UsageStats';
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

interface UsageData {
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageData | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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

  // Fetch usage stats
  const fetchUsageStats = async () => {
    try {
      const data = await videoApi.getUsageStats();
      setUsageStats(data);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchUsageStats();
      // Poll every 5 seconds to check for status updates
      const interval = setInterval(() => {
        fetchVideos();
        fetchUsageStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await videoApi.uploadVideo(file);
      fetchVideos();
      fetchUsageStats(); // Refresh usage stats after upload
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
      fetchUsageStats(); // Refresh usage stats after delete
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {usageStats && <UsageStats stats={usageStats} />}
      <UploadSection onUpload={handleUpload} uploading={uploading} />
      <VideoList videos={videos} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
