'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';

interface MLInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  affectedItems: number;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

const severityColors: Record<string, string> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

const severityIcons: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
  critical: '⚫',
};

export default function AdvancedInsightsPage() {
  const [insights, setInsights] = useState<MLInsight[]>([
    {
      id: 'insight-1',
      title: 'Anomalous Volume Spike Detected',
      description:
        'Email volume from external domains increased by 312% in last 2 hours compared to baseline. This exceeds the normal daily variance by 2.8 standard deviations.',
      confidence: 0.94,
      affectedItems: 1243,
      recommendation:
        'Review emails from new senders and implement temporary rate limiting. Check SPF/DKIM records for spoofing.',
      severity: 'high',
      timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    },
    {
      id: 'insight-2',
      title: 'Credential Harvesting Campaign Detected',
      description:
        'ML model identified 47 emails using credential harvesting patterns. Emails contain urgent calls-to-action paired with fake login pages and mismatched links.',
      confidence: 0.89,
      affectedItems: 47,
      recommendation:
        'Quarantine all detected emails. Alert users who clicked. Deploy security awareness email.',
      severity: 'critical',
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
      id: 'insight-3',
      title: 'Unusual Recipient Patterns',
      description:
        'One sender is operating a mass mailing campaign to random departments. Typically this sender only emails Finance team, 98% accuracy in historical behavior.',
      confidence: 0.91,
      affectedItems: 156,
      recommendation:
        'Investigate source email account for compromise. Review all sent emails from this account in last 48 hours.',
      severity: 'high',
      timestamp: new Date(Date.now() - 4.5 * 3600000).toISOString(),
    },
    {
      id: 'insight-4',
      title: 'Invoice Fraud Pattern Emerging',
      description:
        'Detected 23 emails matching "invoice fraud" attack pattern. Similar to Q3 2023 campaign that resulted in $140K loss.',
      confidence: 0.86,
      affectedItems: 23,
      recommendation:
        'Cross-reference with previous campaign. Alert Accounts Payable team. Review payment processing procedures.',
      severity: 'high',
      timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    {
      id: 'insight-5',
      title: 'False Positive Reduction',
      description:
        'Model retraining shows 18% reduction in false positives from new feature engineering. Precision improved from 0.842 to 0.921.',
      confidence: 0.97,
      affectedItems: 0,
      recommendation:
        'Update production model with latest training. Plan A/B testing with 5% of email volume.',
      severity: 'low',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const criticalCount = insights.filter((i) => i.severity === 'critical').length;
  const highCount = insights.filter((i) => i.severity === 'high').length;
  const avgConfidence =
    insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const totalAffected = insights.reduce((sum, i) => sum + i.affectedItems, 0);

  return (
    <PageLayout
      title="ML Insights"
      description="Advanced machine learning predictions and anomaly analysis"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-sm font-semibold text-gray-600 mt-1">Critical Insights</p>
              <p className="text-xs text-gray-600 mt-1">Immediate action required</p>
            </div>
          </Card>

          <Card variant="elevated">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{highCount}</p>
              <p className="text-sm font-semibold text-gray-600 mt-1">High Severity</p>
              <p className="text-xs text-gray-600 mt-1">Review within 24 hours</p>
            </div>
          </Card>

          <Card variant="elevated">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {(avgConfidence * 100).toFixed(0)}%
              </p>
              <p className="text-sm font-semibold text-gray-600 mt-1">Avg Confidence</p>
              <p className="text-xs text-gray-600 mt-1">Model accuracy</p>
            </div>
          </Card>

          <Card variant="elevated">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {totalAffected.toLocaleString()}
              </p>
              <p className="text-sm font-semibold text-gray-600 mt-1">Items Affected</p>
              <p className="text-xs text-gray-600 mt-1">Total across all insights</p>
            </div>
          </Card>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Active Insights</h2>
            <div className="text-sm text-gray-600">
              {insights.length} insights detected
            </div>
          </div>

          {insights.map((insight) => {
            const isExpanded = expandedId === insight.id;
            return (
              <Card
                key={insight.id}
                variant={insight.severity === 'critical' ? 'elevated' : 'default'}
                className={`border-l-4 ${
                  insight.severity === 'critical'
                    ? 'border-l-red-600'
                    : insight.severity === 'high'
                    ? 'border-l-orange-500'
                    : insight.severity === 'medium'
                    ? 'border-l-yellow-500'
                    : 'border-l-green-500'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">
                        {severityIcons[insight.severity]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {insight.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Badge variant={severityColors[insight.severity] as any}>
                        {insight.severity}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t border-gray-200">
                    <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                    <span>•</span>
                    <span>Affected: {insight.affectedItems.toLocaleString()} items</span>
                    <span>•</span>
                    <span>
                      {Math.round(
                        (Date.now() - new Date(insight.timestamp).getTime()) / 3600000
                      )}h
                      ago
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          insight.confidence > 0.9
                            ? 'bg-green-500'
                            : insight.confidence > 0.8
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{ width: `${insight.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {(insight.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-gray-200 space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">
                          📋 Full Description
                        </h4>
                        <p className="text-sm text-gray-700">{insight.description}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">
                          💡 Recommendation
                        </h4>
                        <p className="text-sm text-gray-700">{insight.recommendation}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="primary" size="sm">
                          Take Action
                        </Button>
                        <Button variant="secondary" size="sm">
                          View Evidence
                        </Button>
                        <Button variant="ghost" size="sm">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : insight.id)
                    }
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ML Model Info */}
        <Card variant="default">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold text-gray-900">ML Model Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Model Version</p>
                    <p className="font-semibold text-gray-900">v2.1.4</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Last Training</p>
                    <p className="font-semibold text-gray-900">2 days ago</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Accuracy</p>
                    <p className="font-semibold text-gray-900">94.2%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Training Samples</p>
                    <p className="font-semibold text-gray-900">87.5K</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
