'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Search, Filter, Calendar, User, Activity } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  metadata: any;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    // Fetch logs on mount
    fetchLogs(0);
  }, []);

  const fetchLogs = async (currentOffset: number) => {
    if (currentOffset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString()
      });

      const response = await axios.get(`${API_URL}/api/account/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newLogs = response.data.activity || [];
      
      if (currentOffset === 0) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
      
      // If we got fewer logs than requested, there are no more
      setHasMore(newLogs.length === LIMIT);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchLogs(offset);
    }
  };

  const getActionColor = (action: string): string => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-50';
    if (action.includes('create') || action.includes('invite')) return 'text-green-600 bg-green-50';
    if (action.includes('update') || action.includes('change')) return 'text-blue-600 bg-blue-50';
    if (action.includes('login') || action.includes('auth')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('auth') || action.includes('login')) return '🔐';
    if (action.includes('user') || action.includes('team')) return '👤';
    if (action.includes('video')) return '🎬';
    if (action.includes('billing') || action.includes('plan')) return '💳';
    if (action.includes('api')) return '🔑';
    return '📝';
  };

  const formatAction = (action: string): string => {
    return action
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Client-side filtering (both action and search)
  let filteredLogs = logs;
  
  // Filter by action
  if (filterAction) {
    filteredLogs = filteredLogs.filter(log => log.action === filterAction);
  }
  
  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredLogs = filteredLogs.filter(log =>
      log.action.toLowerCase().includes(query) ||
      log.userName.toLowerCase().includes(query) ||
      log.userEmail.toLowerCase().includes(query) ||
      log.resourceType.toLowerCase().includes(query)
    );
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary-600" />
          Audit Logs
        </h1>
        <p className="mt-2 text-gray-600">
          Track all security events and actions in your organization
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, user, or resource..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter by Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-2" />
              Filter by Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log ({filteredLogs.length})
          </h2>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.resourceType}
                        </span>
                      </div>

                      <p className="text-sm text-gray-900 mb-1">
                        <span className="font-medium">{log.userName}</span>
                        <span className="text-gray-500"> ({log.userEmail})</span>
                      </p>

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Technical Details */}
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !searchQuery && !filterAction && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More Logs'}
            </button>
          </div>
        )}
        
        {/* Note when filtering */}
        {(searchQuery || filterAction) && hasMore && (
          <div className="px-6 py-3 border-t border-gray-200 bg-yellow-50 text-center">
            <p className="text-xs text-yellow-800">
              Filtering only searches loaded logs. Load more logs to see additional results.
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Security & Compliance</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Audit logs are retained for 90 days and include all security-relevant actions such as:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Authentication events (login, logout, password changes)</li>
                <li>Team management (invites, role changes, removals)</li>
                <li>Resource changes (video uploads, deletions, updates)</li>
                <li>Billing and plan changes</li>
                <li>API key creation and usage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
