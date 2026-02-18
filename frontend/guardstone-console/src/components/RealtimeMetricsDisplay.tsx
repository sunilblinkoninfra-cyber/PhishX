/**
 * Real-time Metrics Dashboard Component
 * Displays live SOC metrics with WebSocket updates
 */

'use client';

import React, { useEffect } from 'react';
import { RealtimeMetrics, WebSocketMessage } from '@/types';
import { useRealtimeStore } from '@/stores';
import { useRealtimeMetrics } from '@/hooks/useWebSocket';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: 'red' | 'yellow' | 'green' | 'blue';
}

function MetricCard({
  label,
  value,
  unit,
  trend,
  icon,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  const iconClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <div className={`p-4 border-l-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800">{value}</span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
        </div>
        {icon && <span className={`text-3xl ${iconClasses[color]}`}>{icon}</span>}
      </div>
      {trend && (
        <div className="mt-2 text-xs text-gray-600">
          {trend === 'up' && '📈 Increasing'}
          {trend === 'down' && '📉 Decreasing'}
          {trend === 'neutral' && '➡️ Stable'}
        </div>
      )}
    </div>
  );
}

export function RealtimeMetricsDisplay() {
  const { metrics, lastMetricsUpdate, isSystemHealthy } = useRealtimeStore();
  const [previousMetrics, setPreviousMetrics] = React.useState<RealtimeMetrics | null>(null);

  // Handle real-time metrics updates
  useRealtimeMetrics((message: WebSocketMessage) => {
    const newMetrics = message.payload as RealtimeMetrics;
    if (newMetrics) {
      useRealtimeStore().updateMetrics(newMetrics);
    }
  });

  // Track previous metrics for trend detection
  useEffect(() => {
    if (metrics && previousMetrics) {
      // Update trends (in a real app, would track over time)
    }
    setPreviousMetrics(metrics);
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Loading metrics...</p>
      </div>
    );
  }

  const getTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (!previous) return 'neutral';
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">System Health</h2>
            <p className="text-sm text-gray-600">
              Last updated: {lastMetricsUpdate ? new Date(lastMetricsUpdate).toLocaleTimeString() : 'Never'}
            </p>
          </div>
          <div
            className={`text-center px-6 py-4 rounded-lg ${
              isSystemHealthy()
                ? 'bg-green-100 border border-green-300'
                : 'bg-red-100 border border-red-300'
            }`}
          >
            <div className={`text-2xl font-bold ${isSystemHealthy() ? 'text-green-600' : 'text-red-600'}`}>
              {isSystemHealthy() ? '✓ Healthy' : '✕ Critical'}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Alerts/Minute"
          value={metrics.alertsPerMinute.toFixed(2)}
          unit="alerts"
          trend={getTrend(
            metrics.alertsPerMinute,
            previousMetrics?.alertsPerMinute || 0
          )}
          icon="🚨"
          color="red"
        />

        <MetricCard
          label="Active Incidents"
          value={metrics.activeIncidents}
          unit="incidents"
          trend={getTrend(
            metrics.activeIncidents,
            previousMetrics?.activeIncidents || 0
          )}
          icon="🔥"
          color="orange"
        />

        <MetricCard
          label="Quarantined"
          value={metrics.quarantinedCount}
          unit="messages"
          icon="🔒"
          color="yellow"
        />

        <MetricCard
          label="Avg Resolution"
          value={metrics.averageResolutionTime.toFixed(1)}
          unit="minutes"
          icon="⏱️"
          color="green"
        />
      </div>

      {/* Top Sources */}
      {metrics.topSources.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Alert Sources</h3>
          <div className="space-y-3">
            {metrics.topSources.slice(0, 5).map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{source.source}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{
                        width: `${
                          (source.count /
                            Math.max(...metrics.topSources.map((s) => s.count))) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {source.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories */}
      {metrics.topCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Categories</h3>
          <div className="space-y-3">
            {metrics.topCategories.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{category.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{
                        width: `${
                          (category.count /
                            Math.max(...metrics.topCategories.map((c) => c.count))) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {category.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
