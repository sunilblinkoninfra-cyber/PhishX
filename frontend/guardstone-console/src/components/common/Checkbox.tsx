'use client';

import React, { InputHTMLAttributes } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export default function Checkbox({
  label,
  error,
  helpText,
  className,
  ...props
}: CheckboxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
          {...props}
        />
        {label && (
          <label className="text-sm font-medium text-gray-900 cursor-pointer">
            {label}
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}
