/**
 * Input Component
 * Flexible text input with validation and error states
 */

'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Input({
  label,
  error,
  helpText,
  required = false,
  prefix,
  suffix,
  disabled = false,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-gray-500">{prefix}</span>}
        <input
          disabled={disabled}
          className={`w-full px-4 py-2 rounded-md border ${
            error ? 'border-red-500' : 'border-gray-300'
          } bg-white text-gray-900 placeholder-gray-500 ${
            prefix ? 'pl-10' : ''
          } ${suffix ? 'pr-10' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
          } ${className}`}
          {...props}
        />
        {suffix && <span className="absolute right-3 text-gray-500">{suffix}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

export default Input;
