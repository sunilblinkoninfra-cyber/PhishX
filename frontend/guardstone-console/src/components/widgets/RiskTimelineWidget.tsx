'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { RiskTimelineData } from '@/types/widgets';

interface RiskTimelineWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function RiskTimelineWidget({
  onRefresh,
  lastRefreshed,
}: RiskTimelineWidgetProps) {
  const [data, setData] = useState<RiskTimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (6 - i) * 86400000);
      return {
        timestamp: date,
        hotCount: Math.floor(Math.random() * 20),
        warmCount: Math.floor(Math.random() * 40),
        coldCount: Math.floor(Math.random() * 80),
      };
    });

    setTimeout(() => {
      setData({ timeline: days });
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

  const maxCount = Math.max(
    ...data!.timeline.map((d) => d.hotCount + d.warmCount + d.coldCount)
  );

  return (
    <Card variant="default">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">📈 Risk Timeline (7 Days)</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data?.timeline.map((day) => {
            const total = day.hotCount + day.warmCount + day.coldCount;
            const hotPct = (day.hotCount / total) * 100;
            const warmPct = (day.warmCount / total) * 100;

            return (
              <div key={day.timestamp.toISOString()} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {day.timestamp.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-gray-900 font-semibold">{total}</span>
                </div>
                <div className="flex h-6 gap-0.5 rounded-lg overflow-hidden bg-gray-200">
                  {day.hotCount > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ width: `${hotPct}%` }}
                      title={`HOT: ${day.hotCount}`}
                    />
                  )}
                  {day.warmCount > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${warmPct}%` }}
                      title={`WARM: ${day.warmCount}`}
                    />
                  )}
                  {day.coldCount > 0 && (
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(day.coldCount / total) * 100}%` }}
                      title={`COLD: ${day.coldCount}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
          <div className="text-center">
            <Badge variant="error" size="sm">HOT</Badge>
            <p className="text-xs text-gray-600 mt-1">
              {data?.timeline.reduce((sum, d) => sum + d.hotCount, 0) || 0}
            </p>
          </div>
          <div className="text-center">
            <Badge variant="warning" size="sm">WARM</Badge>
            <p className="text-xs text-gray-600 mt-1">
              {data?.timeline.reduce((sum, d) => sum + d.warmCount, 0) || 0}
            </p>
          </div>
          <div className="text-center">
            <Badge variant="info" size="sm">COLD</Badge>
            <p className="text-xs text-gray-600 mt-1">
              {data?.timeline.reduce((sum, d) => sum + d.coldCount, 0) || 0}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
