'use client';

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { WIDGET_DEFINITIONS, WidgetType } from '@/types/widgets';

interface WidgetLibraryProps {
  onAddWidget?: (widgetType: WidgetType) => void;
  selectedWidgets?: string[];
}

export default function WidgetLibrary({
  onAddWidget,
  selectedWidgets = [],
}: WidgetLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [...new Set(Object.values(WIDGET_DEFINITIONS).map((w) => w.category))];

  const filteredWidgets = Object.entries(WIDGET_DEFINITIONS).filter(([type, def]) => {
    const matchesCategory = !activeCategory || def.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      def.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryColors: Record<string, string> = {
    analytics: 'bg-blue-100 text-blue-900',
    threats: 'bg-red-100 text-red-900',
    operations: 'bg-green-100 text-green-900',
    intelligence: 'bg-purple-100 text-purple-900',
  };

  const sizeColors: Record<string, string> = {
    small: 'bg-gray-100 text-gray-900',
    medium: 'bg-blue-100 text-blue-900',
    large: 'bg-purple-100 text-purple-900',
    full: 'bg-red-100 text-red-900',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Widget Library</h2>
        <p className="text-gray-600">
          Browse and add widgets to customize your dashboard
        </p>
      </div>

      {/* Search and Filters */}
      <Card variant="default">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Categories</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeCategory === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                    activeCategory === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Found {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      {/* Widget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWidgets.map(([type, def]) => {
          const isSelected = selectedWidgets.includes(type);

          return (
            <Card
              key={type}
              variant={isSelected ? 'elevated' : 'default'}
              className={isSelected ? 'border-2 border-blue-500' : ''}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{def.icon}</span>
                      <h3 className="font-semibold text-gray-900">{def.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{def.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant="primary"
                      className={categoryColors[def.category]}
                      size="sm"
                    >
                      {def.category}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={sizeColors[def.defaultSize]}
                      size="sm"
                    >
                      {def.defaultSize}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      🔄 Refresh: {Math.round(def.refreshIntervalDefault / 60)}s
                    </p>
                  </div>
                </div>

                <Button
                  variant={isSelected ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  onClick={() => onAddWidget?.(type as WidgetType)}
                >
                  {isSelected ? '✓ Added' : '+ Add'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredWidgets.length === 0 && (
        <Card variant="elevated" className="text-center py-8">
          <p className="text-4xl mb-2">🔍</p>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Widgets Found</h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      )}
    </div>
  );
}
