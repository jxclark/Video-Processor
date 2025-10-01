'use client';

import { Video, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatFileSize } from '@/utils/formatters';

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

interface VideoCardProps {
  video: VideoData;
  onDelete: (id: string) => void;
}

export default function VideoCard({ video, onDelete }: VideoCardProps) {
  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">
              {video.originalFilename}
            </h3>
            <StatusBadge status={video.status} />
          </div>
          
          <div className="ml-8 space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Size:</span> {formatFileSize(video.fileSize)}
              {video.duration && (
                <span className="ml-4">
                  <span className="font-medium">Duration:</span> {video.duration.toFixed(2)}s
                </span>
              )}
            </div>
            
            {video.transcodedVideos.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Transcoded versions:</span>
                <div className="mt-1 space-y-1">
                  {video.transcodedVideos.map((tv) => (
                    <div key={tv.id} className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">{tv.resolution}:</span>
                      <StatusBadge status={tv.status} />
                      {tv.status === 'completed' && (
                        <span className="text-xs">({formatFileSize(tv.fileSize)})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => onDelete(video.id)}
          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete video"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
