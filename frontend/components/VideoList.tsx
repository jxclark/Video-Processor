'use client';

import { Video } from 'lucide-react';
import VideoCard from './VideoCard';

interface TranscodedVideo {
  id: string;
  resolution: string;
  fileSize: string;
  status: string;
  createdAt: string;
}

interface VideoData {
  id: string;
  originalFilename: string;
  fileSize: string;
  status: string;
  duration: number | null;
  createdAt: string;
  transcodedVideos: TranscodedVideo[];
}

interface VideoListProps {
  videos: VideoData[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function VideoList({ videos, loading, onDelete }: VideoListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Videos</h2>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : videos.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No videos uploaded yet</p>
        </div>
      ) : (
        <div className="divide-y">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
