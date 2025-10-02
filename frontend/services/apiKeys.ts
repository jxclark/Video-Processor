import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export const apiKeysService = {
  // Get all API keys
  getAllKeys: async (): Promise<ApiKey[]> => {
    const response = await axios.get(`${API_URL}/api/keys`, {
      headers: getAuthHeaders()
    });
    return response.data.apiKeys;
  },

  // Create new API key
  createKey: async (name: string, permissions: string[]): Promise<ApiKey> => {
    const response = await axios.post(
      `${API_URL}/api/keys`,
      { name, permissions },
      { headers: getAuthHeaders() }
    );
    return response.data.apiKey;
  },

  // Revoke API key
  revokeKey: async (id: string): Promise<void> => {
    await axios.patch(
      `${API_URL}/api/keys/${id}/revoke`,
      {},
      { headers: getAuthHeaders() }
    );
  },

  // Reactivate API key
  reactivateKey: async (id: string): Promise<void> => {
    await axios.patch(
      `${API_URL}/api/keys/${id}/reactivate`,
      {},
      { headers: getAuthHeaders() }
    );
  },

  // Delete API key
  deleteKey: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/keys/${id}`, {
      headers: getAuthHeaders()
    });
  },
};
