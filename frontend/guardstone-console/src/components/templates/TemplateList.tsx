'use client';

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import Input from '@/components/common/Input';
import { Template, TEMPLATE_CATEGORIES } from '@/types/templates';

interface TemplateListProps {
  templates: Template[];
  onSelectTemplate?: (template: Template) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onEditTemplate?: (template: Template) => void;
  loading?: boolean;
}

const typeIcons: Record<string, string> = {
  investigation: '🔍',
  response: '⚡',
  dashboard: '📊',
  report: '📋',
  playbook: '📖',
};

const typeColors: Record<string, string> = {
  investigation: 'info',
  response: 'error',
  dashboard: 'primary',
  report: 'success',
  playbook: 'warning',
};

export default function TemplateList({
  templates,
  onSelectTemplate,
  onDeleteTemplate,
  onEditTemplate,
  loading = false,
}: TemplateListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'usage'>('recent');

  const filteredTemplates = templates
    .filter((t) => {
      const matchesQuery = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !filterType || t.type === filterType;
      return matchesQuery && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card variant="default">
        <div className="space-y-4">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix="🔍"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Filter by Type
              </label>
              <select
                value={filterType || ''}
                onChange={(e) => setFilterType(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Types</option>
                <option value="investigation">Investigation</option>
                <option value="response">Response</option>
                <option value="dashboard">Dashboard</option>
                <option value="report">Report</option>
                <option value="playbook">Playbook</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name A-Z</option>
                <option value="usage">Most Used</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Stats
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm">
                {filteredTemplates.length}/{templates.length} templates
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            variant="default"
            className="hover:shadow-lg transition-shadow"
          >
            <div className="space-y-3">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-2xl">
                      {typeIcons[template.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {template.category}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {template.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                <span>Used {template.usageCount} times</span>
                <span>
                  Updated{' '}
                  {Math.round(
                    (Date.now() - new Date(template.updatedAt).getTime()) / 86400000
                  )}d ago
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {template.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="info" size="sm">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 2 && (
                  <Badge variant="secondary" size="sm">
                    +{template.tags.length - 2}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => onSelectTemplate?.(template)}
                >
                  Use Template
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditTemplate?.(template)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTemplate?.(template.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card variant="elevated" className="text-center py-12">
          <p className="text-4xl mb-2">📋</p>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-600 mb-4">
            {templates.length === 0
              ? 'No templates created yet. Create your first template!'
              : 'No templates match your search criteria.'}
          </p>
          <Button variant="primary">Create Template</Button>
        </Card>
      )}
    </div>
  );
}
