'use client';

import { Database, HardDrive, Clock, Activity } from 'lucide-react';

interface UsageStatsProps {
  stats: {
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
  };
}

export default function UsageStats({ stats }: UsageStatsProps) {
  const getPercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString();
  };

  const usageItems = [
    {
      icon: <Database className="w-5 h-5" />,
      label: 'Videos Uploaded',
      current: stats.current.videosUploaded,
      limit: stats.limits.videosPerMonth,
      unit: 'videos'
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Minutes Processed',
      current: Math.round(stats.current.minutesProcessed),
      limit: stats.limits.minutesPerMonth,
      unit: 'min'
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      label: 'Storage Used',
      current: stats.current.storageUsedGB,
      limit: stats.limits.storageGB,
      unit: 'GB',
      decimals: 2
    },
    {
      icon: <Activity className="w-5 h-5" />,
      label: 'API Calls',
      current: stats.current.apiCalls,
      limit: stats.limits.apiCallsPerMonth,
      unit: 'calls'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Usage Statistics</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Plan:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
            {stats.plan}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Current billing period: {stats.month}
      </p>

      <div className="space-y-6">
        {usageItems.map((item, index) => {
          const percentage = getPercentage(item.current, item.limit);
          const isUnlimited = item.limit === -1;

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {item.decimals ? item.current.toFixed(item.decimals) : item.current.toLocaleString()} / {formatLimit(item.limit)} {item.unit}
                </span>
              </div>
              
              {!isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
              
              {isUnlimited && (
                <div className="text-sm text-green-600 font-medium">
                  ∞ Unlimited
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
