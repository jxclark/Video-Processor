import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const videoApi = {
  // Get all videos
  getAllVideos: async () => {
    const response = await axios.get(`${API_URL}/api/videos`);
    return response.data.videos;
  },

  // Upload video
  uploadVideo: async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await axios.post(`${API_URL}/api/videos/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Delete video
  deleteVideo: async (id: string) => {
    const response = await axios.delete(`${API_URL}/api/videos/${id}`);
    return response.data;
  },

  // Get video by ID
  getVideoById: async (id: string) => {
    const response = await axios.get(`${API_URL}/api/videos/${id}`);
    return response.data.video;
  },

  // Get usage statistics
  getUsageStats: async () => {
    const response = await axios.get(`${API_URL}/api/usage/stats`);
    return response.data;
  },
};
