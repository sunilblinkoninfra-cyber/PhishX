'use client';

import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import { RiskLevel, AlertStatus, EmailClassification } from '@/types/api';

interface FilterFormProps {
  onApplyFilters: (filters: FilterState) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export interface FilterState {
  riskLevels: RiskLevel[];
  statuses: AlertStatus[];
  classifications: EmailClassification[];
  dateFrom?: string;
  dateTo?: string;
}

const riskLevelOptions: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'COLD', label: 'Cold (0-3.0)', color: 'bg-blue-100 text-blue-900' },
  { value: 'WARM', label: 'Warm (3.0-7.0)', color: 'bg-yellow-100 text-yellow-900' },
  { value: 'HOT', label: 'Hot (7.0-10.0)', color: 'bg-red-100 text-red-900' },
];

const statusOptions: { value: AlertStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
];

const classificationOptions: { value: EmailClassification; label: string }[] = [
  { value: 'PHISHING', label: 'Phishing' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'MALWARE', label: 'Malware' },
  { value: 'BUSINESS_EMAIL_COMPROMISE', label: 'BEC' },
  { value: 'LEGITIMATE', label: 'Legitimate' },
];

export default function FilterForm({
  onApplyFilters,
  onClearFilters,
  loading = false,
}: FilterFormProps) {
  const [filters, setFilters] = useState<FilterState>({
    riskLevels: [],
    statuses: [],
    classifications: [],
  });

  const handleToggleRiskLevel = useCallback((level: RiskLevel) => {
    setFilters((prev) => ({
      ...prev,
      riskLevels: prev.riskLevels.includes(level)
        ? prev.riskLevels.filter((l) => l !== level)
        : [...prev.riskLevels, level],
    }));
  }, []);

  const handleToggleStatus = useCallback((status: AlertStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const handleToggleClassification = useCallback((classification: EmailClassification) => {
    setFilters((prev) => ({
      ...prev,
      classifications: prev.classifications.includes(classification)
        ? prev.classifications.filter((c) => c !== classification)
        : [...prev.classifications, classification],
    }));
  }, []);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: e.target.value,
    }));
  }, []);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      dateTo: e.target.value,
    }));
  }, []);

  const hasActiveFilters =
    filters.riskLevels.length > 0 ||
    filters.statuses.length > 0 ||
    filters.classifications.length > 0 ||
    filters.dateFrom ||
    filters.dateTo;

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    setFilters({
      riskLevels: [],
      statuses: [],
      classifications: [],
    });
    onClearFilters();
  };

  return (
    <div className="space-y-4 p-6 bg-white border border-gray-200 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900">Filters</h3>

      {/* Risk Level */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 uppercase">Risk Level</label>
        <div className="flex flex-wrap gap-2">
          {riskLevelOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleToggleRiskLevel(option.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.riskLevels.includes(option.value)
                  ? option.color
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 uppercase">Status</label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleToggleStatus(option.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.statuses.includes(option.value)
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 uppercase">Classification</label>
        <div className="flex flex-wrap gap-2">
          {classificationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleToggleClassification(option.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.classifications.includes(option.value)
                  ? 'bg-purple-100 text-purple-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 uppercase">Date Range</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={handleDateFromChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="From"
            />
          </div>
          <div>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={handleDateToChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={loading}
        >
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClear}
            disabled={loading}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
