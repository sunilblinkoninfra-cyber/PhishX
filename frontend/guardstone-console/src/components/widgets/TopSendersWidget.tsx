'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TopSendersData } from '@/types/widgets';

interface TopSendersWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function TopSendersWidget({
  onRefresh,
  lastRefreshed,
}: TopSendersWidgetProps) {
  const [data, setData] = useState<TopSendersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - would be fetched from API
    setTimeout(() => {
      setData({
        senders: [
          {
            email: 'noreply@fatnybank.com',
            domain: 'fatnybank.com',
            count: 145,
            riskScore: 8.9,
          },
          {
            email: 'support@amz-verify.net',
            domain: 'amz-verify.net',
            count: 112,
            riskScore: 7.6,
          },
          {
            email: 'alerts@paypa1.shop',
            domain: 'paypa1.shop',
            count: 89,
            riskScore: 8.2,
          },
          {
            email: 'noreply@microsofu.com',
            domain: 'microsofu.com',
            count: 67,
            riskScore: 7.1,
          },
          {
            email: 'security@go0gle-com.info',
            domain: 'go0gle-com.info',
            count: 54,
            riskScore: 8.5,
          },
        ],
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Card variant="default" className="flex items-center justify-center min-h-64">
        <LoadingSpinner />
      </Card>
    );
  }

  return (
    <Card variant="default">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">📧 Top Senders</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data?.senders.map((sender, idx) => (
            <div
              key={sender.email}
              className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {idx + 1}. {sender.domain}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{sender.email}</p>
                </div>
                <Badge
                  variant={sender.riskScore >= 8 ? 'error' : sender.riskScore >= 7 ? 'warning' : 'info'}
                  size="sm"
                >
                  {sender.riskScore.toFixed(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{sender.count} emails</span>
                <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${
                      sender.riskScore >= 8
                        ? 'bg-red-500'
                        : sender.riskScore >= 7
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${(sender.riskScore / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
