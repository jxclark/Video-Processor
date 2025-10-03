'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Video, Clock, HardDrive, Zap, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

export default function UsagePage() {
  const { token, organization } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getColor = (percentage: number): string => {
    if (percentage >= 90) return '#ef4444'; // Red
    if (percentage >= 70) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">No usage data available</p>
      </div>
    );
  }

  const chartData = [
    {
      name: 'Videos',
      current: usage.current.videosUploaded,
      limit: usage.limits.videosPerMonth === -1 ? usage.current.videosUploaded * 1.5 : usage.limits.videosPerMonth,
      percentage: calculatePercentage(usage.current.videosUploaded, usage.limits.videosPerMonth)
    },
    {
      name: 'Minutes',
      current: usage.current.minutesProcessed,
      limit: usage.limits.minutesPerMonth === -1 ? usage.current.minutesProcessed * 1.5 : usage.limits.minutesPerMonth,
      percentage: calculatePercentage(usage.current.minutesProcessed, usage.limits.minutesPerMonth)
    },
    {
      name: 'Storage (GB)',
      current: Number(usage.current.storageUsedGB.toFixed(2)),
      limit: usage.limits.storageGB,
      percentage: calculatePercentage(usage.current.storageUsedGB, usage.limits.storageGB)
    },
    {
      name: 'API Calls',
      current: usage.current.apiCalls,
      limit: usage.limits.apiCallsPerMonth === -1 ? usage.current.apiCalls * 1.5 : usage.limits.apiCallsPerMonth,
      percentage: calculatePercentage(usage.current.apiCalls, usage.limits.apiCallsPerMonth)
    }
  ];

  const stats = [
    {
      name: 'Videos Uploaded',
      value: usage.current.videosUploaded,
      limit: usage.limits.videosPerMonth === -1 ? 'Unlimited' : usage.limits.videosPerMonth,
      icon: Video,
      color: 'bg-blue-500'
    },
    {
      name: 'Minutes Processed',
      value: usage.current.minutesProcessed,
      limit: usage.limits.minutesPerMonth === -1 ? 'Unlimited' : usage.limits.minutesPerMonth,
      icon: Clock,
      color: 'bg-green-500'
    },
    {
      name: 'Storage Used',
      value: `${usage.current.storageUsedGB.toFixed(2)} GB`,
      limit: `${usage.limits.storageGB} GB`,
      icon: HardDrive,
      color: 'bg-purple-500'
    },
    {
      name: 'API Calls',
      value: usage.current.apiCalls.toLocaleString(),
      limit: usage.limits.apiCallsPerMonth === -1 ? 'Unlimited' : usage.limits.apiCallsPerMonth.toLocaleString(),
      icon: Zap,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Usage Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Current usage for <span className="font-semibold capitalize">{usage.plan}</span> plan - {usage.month}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const percentage = chartData.find(d => d.name.includes(stat.name.split(' ')[0]))?.percentage || 0;
          
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        <div className="ml-2 text-sm text-gray-500">/ {stat.limit}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className={`text-xs font-semibold inline-block ${
                          percentage >= 90 ? 'text-red-600' : percentage >= 70 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Usage vs Limits
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="current" fill="#4F46E5" name="Current Usage" />
            <Bar dataKey="limit" fill="#E5E7EB" name="Limit">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.percentage)} opacity={0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Upgrade Notice */}
      {chartData.some(d => d.percentage >= 80) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You're approaching your plan limits. Consider{' '}
                <a href="/pricing" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                  upgrading your plan
                </a>{' '}
                to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
