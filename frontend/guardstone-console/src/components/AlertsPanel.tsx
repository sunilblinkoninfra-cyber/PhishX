/**
 * Real-time Alerts Panel Component
 * Displays security alerts with real-time updates via WebSocket
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { Alert, AlertStatus, WebSocketMessage } from '@/types';
import { useAlertStore } from '@/stores';
import { useRealtimeAlerts, useWebSocketConnectionStatus } from '@/hooks/useWebSocket';
import { format } from 'date-fns';

interface AlertsPanelProps {
  maxAlerts?: number;
  showFilters?: boolean;
  onAlertClick?: (alert: Alert) => void;
}

export function AlertsPanel({
  maxAlerts = 10,
  showFilters = true,
  onAlertClick,
}: AlertsPanelProps) {
  const store = useAlertStore();
  const isConnected = useWebSocketConnectionStatus();
  const [recentAlerts, setRecentAlerts] = React.useState<Alert[]>([]);

  // Handle real-time alert updates
  useRealtimeAlerts((message: WebSocketMessage) => {
    const payload = message.payload as any;
    if (payload.alert) {
      store.addAlert(payload.alert);
      updateRecentAlerts();
    }
  });

  // Update recent alerts list
  const updateRecentAlerts = useCallback(() => {
    const allAlerts = Array.from(store.alerts.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxAlerts);

    setRecentAlerts(allAlerts);
  }, [store, maxAlerts]);

  // Initial load
  useEffect(() => {
    updateRecentAlerts();
  }, [updateRecentAlerts]);

  const getSeverityColor = (risk: number): string => {
    if (risk >= 80) return 'bg-red-100 border-red-300';
    if (risk >= 60) return 'bg-orange-100 border-orange-300';
    if (risk >= 40) return 'bg-yellow-100 border-yellow-300';
    return 'bg-blue-100 border-blue-300';
  };

  const getSeverityBadgeColor = (risk: number): string => {
    if (risk >= 80) return 'bg-red-500';
    if (risk >= 60) return 'bg-orange-500';
    if (risk >= 40) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = (status: AlertStatus): string => {
    switch (status) {
      case AlertStatus.NEW:
        return '🔴';
      case AlertStatus.ACKNOWLEDGED:
        return '🟡';
      case AlertStatus.IN_PROGRESS:
        return '🔵';
      case AlertStatus.RESOLVED:
        return '🟢';
      case AlertStatus.FALSE_POSITIVE:
        return '⚪';
      default:
        return '⭕';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Recent Alerts</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}
          ></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {recentAlerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No alerts at this time</p>
          <p className="text-sm">Your SOC is operating smoothly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentAlerts.map((alert) => (
            <div
              key={alert.metadata.id}
              onClick={() => onAlertClick?.(alert)}
              className={`p-4 border-l-4 rounded cursor-pointer transition ${getSeverityColor(
                alert.riskBreakdown.overallRisk
              )} hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getStatusIcon(alert.status)}</span>
                    <h3 className="font-semibold text-gray-800 flex-1">
                      {alert.metadata.subject}
                    </h3>
                    <span className={`text-xs text-white px-2 py-1 rounded ${getSeverityBadgeColor(alert.riskBreakdown.overallRisk)}`}>
                      {alert.riskBreakdown.overallRisk.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    From: <span className="font-mono">{alert.metadata.sender}</span>
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Category: {alert.classifications?.[0] || 'Unknown'}</span>
                    <span>{format(new Date(alert.metadata.received), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Risk breakdown bar */}
              <div className="mt-3 space-y-1">
                {Object.entries(alert.riskBreakdown)
                  .filter(
                    ([key]) =>
                      key !== 'overallRisk'
                  )
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <div className="w-20 bg-gray-300 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${getSeverityBadgeColor(
                            (value as number) || 0
                          )}`}
                          style={{
                            width: `${Math.min(100, (value as number) || 0)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-8 text-right">
                        {((value as number) || 0).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t text-center">
        <button className="text-red-500 hover:text-red-700 font-semibold text-sm">
          View All Alerts →
        </button>
      </div>
    </div>
  );
}
