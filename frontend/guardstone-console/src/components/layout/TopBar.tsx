/**
 * Top Bar Component
 * Header with search, notifications, and user menu
 */

'use client';

import { useState } from 'react';
import { useUI } from '@/hooks';
import { Input, Button } from '@/components/common';

interface TopBarProps {
  onSearch?: (query: string) => void;
  title?: string;
}

export function TopBar({ onSearch, title }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications } = useUI();

  const unreadCount = notifications.length;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        {/* Title */}
        {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}

        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search alerts, IOCs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            suffix="🔍"
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-xs font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Help */}
          <button
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Help"
            title="Help and Documentation"
          >
            ❓
          </button>
        </div>
      </div>
    </header>
  );
}
