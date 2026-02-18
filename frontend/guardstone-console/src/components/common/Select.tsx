/**
 * Select Component
 * Dropdown select with support for groups and opt-groups
 */

'use client';

import { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  options?: (SelectOption | SelectOptionGroup)[];
  placeholder?: string;
}

function isOptionGroup(
  option: SelectOption | SelectOptionGroup
): option is SelectOptionGroup {
  return 'options' in option;
}

export function Select({
  label,
  error,
  helpText,
  required = false,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <select
        disabled={disabled}
        className={`w-full px-4 py-2 rounded-md border ${
          error ? 'border-red-500' : 'border-gray-300'
        } bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) =>
          isOptionGroup(option) ? (
            <optgroup key={`group-${index}`} label={option.label}>
              {option.options.map((opt) => (
                <option
                  key={`${opt.value}`}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option
              key={`${option.value}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          )
        )}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

export default Select;
