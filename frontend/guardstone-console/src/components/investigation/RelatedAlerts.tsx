'use client';

import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Alert } from '@/types/api';
import { formatDate } from '@/utils/formatters';

interface RelatedAlertsProps {
  currentAlertId: string;
}

interface RelatedAlert {
  id: string;
  from: string;
  subject: string;
  timestamp: Date;
  riskScore: number;
  similarity: number; // 0-100 percentage
}

export default function RelatedAlerts({ currentAlertId }: RelatedAlertsProps) {
  const [relatedAlerts, setRelatedAlerts] = useState<RelatedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - would be fetched from API
    const mockRelated: RelatedAlert[] = [
      {
        id: 'ALT-2024-0001',
        from: 'noreply@fake-bank.com',
        subject: 'Verify Your Account Immediately',
        timestamp: new Date(Date.now() - 3600000),
        riskScore: 8.2,
        similarity: 92,
      },
      {
        id: 'ALT-2024-0002',
        from: 'support@suspicious-domain.net',
        subject: 'Confirm Your Identity',
        timestamp: new Date(Date.now() - 7200000),
        riskScore: 7.8,
        similarity: 85,
      },
      {
        id: 'ALT-2024-0003',
        from: 'noreply@similar-phish.com',
        subject: 'Urgent: Account Verification Required',
        timestamp: new Date(Date.now() - 86400000),
        riskScore: 7.5,
        similarity: 78,
      },
    ];

    setRelatedAlerts(mockRelated);
    setLoading(false);
  }, [currentAlertId]);

  if (loading) {
    return (
      <Card variant="elevated">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Related Alerts</h3>
          <p className="text-sm text-gray-500">Loading similar alerts...</p>
        </div>
      </Card>
    );
  }

  if (relatedAlerts.length === 0) {
    return (
      <Card variant="elevated">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Related Alerts</h3>
          <p className="text-sm text-gray-500">No similar alerts found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Related Alerts</h3>
        <p className="text-xs text-gray-500">
          {relatedAlerts.length} similar alerts found
        </p>

        <div className="space-y-3">
          {relatedAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-500">{alert.id}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{alert.from}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-lg font-bold text-red-600">{alert.riskScore.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>

              <p className="text-xs text-gray-700 truncate mb-2">{alert.subject}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatDate(alert.timestamp)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-green-600">
                      {alert.similarity}% match
                    </p>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-0.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${alert.similarity}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-left"
                >
                  View Alert →
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
