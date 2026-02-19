/**
 * Status Badge Component
 * Displays alert status with appropriate color and icon
 */

'use client';

import { AlertStatus } from '@/types/api';
import { getStatusColor, formatStatus } from '@/utils/formatters';

interface StatusBadgeProps {
  status: AlertStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getStatusIcon(status: AlertStatus): React.ReactNode {
  switch (status) {
    case 'NEW':
      return '●';
    case 'INVESTIGATING':
      return '⋯';
    case 'CONFIRMED':
      return '✓';
    case 'FALSE_POSITIVE':
      return '✗';
    case 'RESOLVED':
      return '✓✓';
    default:
      return '';
  }
}

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const icon = getStatusIcon(status);

  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md font-medium ${colorClass} ${sizeClass} ${className}`}
    >
      <span>{icon}</span>
      {formatStatus(status)}
    </span>
  );
}
