'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { debounce } from '@/utils/helpers';

interface SearchFormProps {
  onSearch: (query: string, type: string) => void;
  onClear: () => void;
  placeholder?: string;
  searchTypes?: { value: string; label: string }[];
  loading?: boolean;
}

const defaultSearchTypes = [
  { value: 'all', label: 'All Fields' },
  { value: 'sender', label: 'Sender' },
  { value: 'subject', label: 'Subject' },
  { value: 'body', label: 'Body Content' },
  { value: 'url', label: 'URL' },
];

export default function SearchForm({
  onSearch,
  onClear,
  placeholder = 'Search emails...',
  searchTypes = defaultSearchTypes,
  loading = false,
}: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  // Debounce the search function to avoid excessive API calls
  const debouncedSearch = useMemo(
    () => debounce((q: string, type: string) => {
      onSearch(q, type);
    }, 500),
    [onSearch]
  );

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery.trim()) {
      debouncedSearch(newQuery, searchType);
    } else {
      onClear();
    }
  }, [debouncedSearch, searchType, onClear]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setSearchType(newType);
    if (query.trim()) {
      debouncedSearch(query, newType);
    }
  }, [debouncedSearch, query]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSearchType('all');
    onClear();
  }, [onClear]);

  return (
    <div className="space-y-4 p-6 bg-white border border-gray-200 rounded-lg">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Search</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder={placeholder}
              value={query}
              onChange={handleQueryChange}
              disabled={loading}
              prefix="🔍"
            />
          </div>
          <div className="w-40">
            <select
              value={searchType}
              onChange={handleTypeChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {query && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Searching for: <span className="font-semibold">{query}</span> in{' '}
            <span className="font-semibold">
              {searchTypes.find((t) => t.value === searchType)?.label || searchType}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
