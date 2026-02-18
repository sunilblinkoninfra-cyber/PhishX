/**
 * Risk Badge Component
 * Displays risk level with appropriate color and styling
 */

'use client';

import { RiskLevel } from '@/types';
import { getRiskLevelColor } from '@/utils/formatters';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskBadge({
  level,
  score,
  size = 'md',
  className = '',
}: RiskBadgeProps) {
  const colorClass = getRiskLevelColor(level);

  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${colorClass} ${sizeClass} ${className}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current"></span>
      {level}
      {score !== undefined && <span className="ml-1">({score.toFixed(1)})</span>}
    </span>
  );
}
