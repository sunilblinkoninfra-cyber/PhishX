'use client';

import React from 'react';
import Card from '../common/Card';
import { Alert } from '@/types/api';

interface RiskBreakdownProps {
  alert: Alert;
}

interface RiskScore {
  label: string;
  score: number;
  maxScore: number;
  color: string;
  icon: string;
}

export default function RiskBreakdown({ alert }: RiskBreakdownProps) {
  // Calculate individual risk components (example logic)
  const riskScores: RiskScore[] = [
    {
      label: 'Sender Reputation',
      score: Math.min(alert.riskScore * 0.3, 10),
      maxScore: 10,
      color: 'bg-red-500',
      icon: '👤',
    },
    {
      label: 'Content Analysis',
      score: Math.min(alert.riskScore * 0.4, 10),
      maxScore: 10,
      color: 'bg-orange-500',
      icon: '📄',
    },
    {
      label: 'URL Threat Level',
      score: Math.min(alert.riskScore * 0.2, 10),
      maxScore: 10,
      color: 'bg-yellow-500',
      icon: '🔗',
    },
    {
      label: 'Attachment Risk',
      score: Math.min(alert.riskScore * 0.1, 10),
      maxScore: 10,
      color: 'bg-purple-500',
      icon: '📎',
    },
  ];

  return (
    <Card variant="elevated">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Risk Score Breakdown</h3>

        {/* Overall Score */}
        <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Score</span>
            <span className="text-3xl font-bold text-red-600">{alert.riskScore.toFixed(1)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
              style={{ width: `${(alert.riskScore / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Component Scores */}
        <div className="space-y-3">
          {riskScores.map((risk, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{risk.icon}</span>
                  <span className="font-medium text-gray-700">{risk.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{risk.score.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${risk.color}`}
                  style={{ width: `${(risk.score / risk.maxScore) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Risk Level Indicator */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Risk Classification</p>
          <div className="flex gap-2">
            <div className={`flex-1 py-2 px-3 rounded text-center text-xs font-semibold ${
              alert.riskLevel === 'HOT'
                ? 'bg-red-100 text-red-900'
                : 'bg-gray-100 text-gray-600'
            }`}>
              🔴 Hot (7-10)
            </div>
            <div className={`flex-1 py-2 px-3 rounded text-center text-xs font-semibold ${
              alert.riskLevel === 'WARM'
                ? 'bg-yellow-100 text-yellow-900'
                : 'bg-gray-100 text-gray-600'
            }`}>
              🟡 Warm (3-7)
            </div>
            <div className={`flex-1 py-2 px-3 rounded text-center text-xs font-semibold ${
              alert.riskLevel === 'COLD'
                ? 'bg-blue-100 text-blue-900'
                : 'bg-gray-100 text-gray-600'
            }`}>
              🔵 Cold (0-3)
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
