'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiKeysService, ApiKey } from '@/services/apiKeys';
import { Key, Plus, Copy, Trash2, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

export default function ApiKeysPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch API keys
  const fetchKeys = async () => {
    try {
      const keys = await apiKeysService.getAllKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user]);

  // Create new API key
  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a key name');
      return;
    }

    setCreating(true);
    try {
      await apiKeysService.createKey(newKeyName, ['video:read', 'video:write']);
      setNewKeyName('');
      setShowCreateModal(false);
      fetchKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  // Copy key to clipboard
  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Revoke key
  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await apiKeysService.revokeKey(id);
      fetchKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      alert('Failed to revoke API key');
    }
  };

  // Reactivate key
  const handleReactivate = async (id: string) => {
    try {
      await apiKeysService.reactivateKey(id);
      fetchKeys();
    } catch (error) {
      console.error('Error reactivating API key:', error);
      alert('Failed to reactivate API key');
    }
  };

  // Delete key
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this API key? This action cannot be undone.')) return;

    try {
      await apiKeysService.deleteKey(id);
      fetchKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your API keys for programmatic access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No API keys yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">{key.name}</h3>
                      {key.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Revoked
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800">
                        {key.key}
                      </code>
                      <button
                        onClick={() => handleCopy(key.key)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === key.key ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      <span>Permissions: {key.permissions.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {key.isActive ? (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                        title="Revoke key"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(key.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Reactivate key"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create API Key</h2>
            
            <div className="mb-4">
              <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
                Key Name
              </label>
              <input
                id="keyName"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewKeyName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
