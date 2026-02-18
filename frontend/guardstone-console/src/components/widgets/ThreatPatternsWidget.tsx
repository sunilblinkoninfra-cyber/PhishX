'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ThreatPatternData } from '@/types/widgets';

interface ThreatPatternsWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function ThreatPatternsWidget({
  onRefresh,
  lastRefreshed,
}: ThreatPatternsWidgetProps) {
  const [data, setData] = useState<ThreatPatternData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData({
        patterns: [
          {
            id: 'pat-001',
            description: 'Urgency-based phishing (Account verification)',
            occurrences: 342,
            severity: 'critical',
            lastSeen: new Date(Date.now() - 3600000),
          },
          {
            id: 'pat-002',
            description: 'Financial institution impersonation',
            occurrences: 218,
            severity: 'critical',
            lastSeen: new Date(Date.now() - 7200000),
          },
          {
            id: 'pat-003',
            description: 'Invoice/payment request fraud',
            occurrences: 156,
            severity: 'high',
            lastSeen: new Date(Date.now() - 300000),
          },
          {
            id: 'pat-004',
            description: 'Credential harvesting via fake login',
            occurrences: 89,
            severity: 'high',
            lastSeen: new Date(Date.now() - 86400000),
          },
        ],
      });
      setLoading(false);
    }, 600);
  }, []);

  const severityColor = {
    low: 'info',
    medium: 'warning',
    high: 'warning',
    critical: 'error',
  } as const;

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
          <h3 className="font-semibold text-gray-900">🎯 Threat Patterns</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data?.patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {pattern.description}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pattern.occurrences} occurrences • Last: {pattern.lastSeen.toLocaleString()}
                  </p>
                </div>
                <Badge variant={severityColor[pattern.severity]} size="sm">
                  {pattern.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="font-semibold text-blue-900 mb-1">📊 Pattern Analysis</p>
          Identifying attack patterns helps predict and block similar threats faster.
        </div>
      </div>
    </Card>
  );
}
