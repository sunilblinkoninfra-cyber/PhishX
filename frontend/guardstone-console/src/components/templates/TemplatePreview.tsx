'use client';

import React from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Template } from '@/types/templates';

interface TemplatePreviewProps {
  template: Template;
  onUse?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
}

const sectionTypeIcons: Record<string, string> = {
  checklist: '✓',
  notes: '📝',
  data: '📊',
  questions: '❓',
  steps: '👣',
};

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

export default function TemplatePreview({
  template,
  onUse,
  onEdit,
  onClose,
}: TemplatePreviewProps) {
  const daysAgo = Math.round(
    (Date.now() - new Date(template.updatedAt).getTime()) / 86400000
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <Card variant="elevated">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-4xl">
                {typeIcons[template.type]}
              </span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {template.name}
                </h1>
                <p className="text-gray-600 mt-2">{template.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t border-gray-200">
            <span>Created by {template.createdBy}</span>
            <span>•</span>
            <span>Updated {daysAgo}d ago</span>
            <span>•</span>
            <span>Used {template.usageCount} times</span>
            {template.isPublic && (
              <>
                <span>•</span>
                <Badge variant="success" size="sm">
                  Public
                </Badge>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Badge variant={typeColors[template.type] as any}>
              {template.type}
            </Badge>
            <Badge variant="secondary">{template.category}</Badge>
            <Badge variant="info">v{template.version}</Badge>
          </div>

          {template.tags.length > 0 && (
            <div className="flex gap-2 pt-2 flex-wrap">
              {template.tags.map((tag) => (
                <Badge key={tag} variant="secondary" size="sm">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Sections Preview */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Template Structure</h2>

        {template.content.sections.length === 0 ? (
          <Card variant="default" className="text-center py-12">
            <p className="text-gray-600">No sections configured in this template</p>
          </Card>
        ) : (
          template.content.sections.map((section, index) => (
            <Card key={section.id} variant="default">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {sectionTypeIcons[section.type]}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {index + 1}. {section.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Type: {section.type}
                      {section.required && ' • Required'}
                    </p>
                  </div>
                </div>

                {/* Type-specific preview */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {section.type === 'checklist' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled
                          className="w-4 h-4"
                        />
                        <span>Item 1 (example)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled
                          className="w-4 h-4"
                        />
                        <span>Item 2 (example)</span>
                      </div>
                    </div>
                  )}

                  {section.type === 'notes' && (
                    <div className="text-sm text-gray-600 italic">
                      [Free-form text content will appear here]
                    </div>
                  )}

                  {section.type === 'data' && (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded border border-gray-300">
                          <span className="text-xs text-gray-600">Field 1</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-300">
                          <span className="text-xs text-gray-600">Field 2</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === 'questions' && (
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">❓ Investigation Question 1?</p>
                      <p className="text-gray-700">❓ Investigation Question 2?</p>
                    </div>
                  )}

                  {section.type === 'steps' && (
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-xs font-semibold text-blue-600">1.</span>
                        <span className="text-gray-700">First action step</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs font-semibold text-blue-600">2.</span>
                        <span className="text-gray-700">Second action step</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Metadata */}
      <Card variant="default">
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Created:</span>
              <p className="font-semibold text-gray-900">
                {new Date(template.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <p className="font-semibold text-gray-900">
                {new Date(template.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>
              <p className="font-semibold text-gray-900">{template.version}</p>
            </div>
            <div>
              <span className="text-gray-600">Usage Count:</span>
              <p className="font-semibold text-gray-900">{template.usageCount}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit Template
        </Button>
        <Button variant="primary" onClick={onUse}>
          Use This Template
        </Button>
      </div>
    </div>
  );
}
