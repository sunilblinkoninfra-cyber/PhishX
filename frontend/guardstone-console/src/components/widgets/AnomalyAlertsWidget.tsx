'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { AnomalyAlertData } from '@/types/widgets';

interface AnomalyAlertsWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function AnomalyAlertsWidget({
  onRefresh,
  lastRefreshed,
}: AnomalyAlertsWidgetProps) {
  const [data, setData] = useState<AnomalyAlertData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData({
        anomalies: [
          {
            id: 'anom-001',
            type: 'Volume Spike',
            description: 'Unusual spike in alerts from domain fatnybank.com (312% increase)',
            confidence: 0.97,
            affectedItems: 145,
            timestamp: new Date(Date.now() - 600000),
          },
          {
            id: 'anom-002',
            type: 'Pattern Change',
            description: 'New phishing pattern detected: Invoice redirect requests',
            confidence: 0.88,
            affectedItems: 34,
            timestamp: new Date(Date.now() - 3600000),
          },
          {
            id: 'anom-003',
            type: 'IP Anomaly',
            description: 'Source IP 185.94.xxx.x shows unusual geographic distribution',
            confidence: 0.79,
            affectedItems: 8,
            timestamp: new Date(Date.now() - 7200000),
          },
        ],
      });
      setLoading(false);
    }, 600);
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
          <h3 className="font-semibold text-gray-900">⚡ Anomaly Alerts</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data?.anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className="p-3 border-l-4 border-purple-500 bg-purple-50 rounded-r-lg"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900">{anomaly.type}</p>
                <Badge variant="info" size="sm">
                  {Math.round(anomaly.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-gray-700 mb-1">{anomaly.description}</p>
              <p className="text-xs text-gray-600">
                {anomaly.affectedItems} items affected •{' '}
                {anomaly.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>

        <div className="text-xs text-amber-900 p-2 bg-amber-50 rounded border border-amber-200">
          <p className="font-semibold mb-1">🤖 ML Detection</p>
          Anomalies detected by unsupervised ML models analyzing patterns and trends.
        </div>
      </div>
    </Card>
  );
}
