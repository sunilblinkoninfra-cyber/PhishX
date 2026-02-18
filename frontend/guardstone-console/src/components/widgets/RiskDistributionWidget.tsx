'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { RiskDistributionData } from '@/types/widgets';

interface RiskDistributionWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function RiskDistributionWidget({
  onRefresh,
  lastRefreshed,
}: RiskDistributionWidgetProps) {
  const [data, setData] = useState<RiskDistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData({
        distribution: {
          hot: 23,
          warm: 156,
          cold: 842,
        },
        trend: 'up',
      });
      setLoading(false);
    }, 400);
  }, []);

  if (loading) {
    return (
      <Card variant="default" className="flex items-center justify-center min-h-40">
        <LoadingSpinner />
      </Card>
    );
  }

  const total = data!.distribution.hot + data!.distribution.warm + data!.distribution.cold;

  return (
    <Card variant="default">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">🔴 Risk Distribution</h3>
          <span className={`text-sm font-bold ${data!.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
            {data!.trend === 'up' ? '↑ Increasing' : '↓ Decreasing'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-700">🔴 Critical (HOT)</span>
              <span className="font-semibold text-red-600">{data!.distribution.hot}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${(data!.distribution.hot / total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {((data!.distribution.hot / total) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-700">🟡 Active (WARM)</span>
              <span className="font-semibold text-yellow-600">{data!.distribution.warm}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-yellow-500"
                style={{ width: `${(data!.distribution.warm / total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {((data!.distribution.warm / total) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-700">🔵 Informational (COLD)</span>
              <span className="font-semibold text-blue-600">{data!.distribution.cold}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${(data!.distribution.cold / total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {((data!.distribution.cold / total) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 text-center">
          <p className="text-sm font-semibold text-gray-900">{total}</p>
          <p className="text-xs text-gray-600">Total items in system</p>
        </div>
      </div>
    </Card>
  );
}
