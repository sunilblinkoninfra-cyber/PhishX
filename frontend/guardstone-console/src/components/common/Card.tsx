/**
 * Card Component
 * Container component for grouping related content
 */

'use client';

import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({
  children,
  header,
  footer,
  variant = 'elevated',
  className = '',
  ...props
}: CardProps) {
  const variantClass = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border-2 border-gray-300',
  }[variant];

  return (
    <div
      className={`rounded-lg overflow-hidden ${variantClass} ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-gray-200 px-6 py-4">{header}</div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-gray-200 px-6 py-4">{footer}</div>
      )}
    </div>
  );
}

export default Card;
