/**
 * Generic Badge Component
 * Flexible badge with multiple color variants
 */

'use client';

import { ReactNode, HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  icon,
  removable = false,
  onRemove,
  className = '',
  ...props
}: BadgeProps) {
  const variantClass = {
    default: 'bg-gray-100 text-gray-900',
    primary: 'bg-blue-100 text-blue-900',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-yellow-100 text-yellow-900',
    error: 'bg-red-100 text-red-900',
    info: 'bg-cyan-100 text-cyan-900',
  }[variant];

  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 inline-flex items-center hover:opacity-75 focus:outline-none"
          aria-label="Remove badge"
        >
          ✕
        </button>
      )}
    </span>
  );
}

export default Badge;
