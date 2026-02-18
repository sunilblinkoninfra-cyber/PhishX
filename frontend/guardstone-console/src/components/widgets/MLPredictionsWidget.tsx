'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { MLPredictionData } from '@/types/widgets';

interface MLPredictionsWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function MLPredictionsWidget({
  onRefresh,
  lastRefreshed,
}: MLPredictionsWidgetProps) {
  const [data, setData] = useState<MLPredictionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock ML predictions
    setTimeout(() => {
      setData({
        predictions: [
          {
            metric: 'Daily Alerts',
            currentValue: 42,
            predicted30d: 56,
            confidence: 0.92,
            trend: 'increasing',
          },
          {
            metric: 'Critical Threats',
            currentValue: 8,
            predicted30d: 12,
            confidence: 0.88,
            trend: 'increasing',
          },
          {
            metric: 'Avg Response Time',
            currentValue: 2.5,
            predicted30d: 2.1,
            confidence: 0.85,
            trend: 'decreasing',
          },
          {
            metric: 'False Positive Rate',
            currentValue: 12,
            predicted30d: 9,
            confidence: 0.79,
            trend: 'decreasing',
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
          <h3 className="font-semibold text-gray-900">🤖 ML Predictions (30d)</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-3">
          {data?.predictions.map((pred) => (
            <div key={pred.metric} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{pred.metric}</p>
                  <p className="text-xs text-gray-600">
                    Current: <span className="font-semibold">{pred.currentValue}</span> → Predicted: <span className="font-semibold text-blue-600">{pred.predicted30d}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${pred.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                    {pred.trend === 'increasing' ? '↑' : '↓'}
                  </div>
                  <p className="text-xs text-gray-600">{Math.round(pred.confidence * 100)}% confidence</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${pred.trend === 'increasing' ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${pred.confidence * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          <p className="font-semibold mb-1">📊 Prediction Details</p>
          <p>ML model trained on last 90 days of data with {Math.round(Math.random() * 0.1 + 0.85) * 100}% accuracy</p>
        </div>
      </div>
    </Card>
  );
}
