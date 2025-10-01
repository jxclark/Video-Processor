'use client';

import { Upload } from 'lucide-react';

interface UploadSectionProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

export default function UploadSection({ onUpload, uploading }: UploadSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
        <input
          type="file"
          accept="video/*"
          onChange={onUpload}
          disabled={uploading}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            MP4, AVI, MOV, MKV, WEBM (max 500MB)
          </p>
        </label>
      </div>
    </div>
  );
}
