'use client';

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import Input from '@/components/common/Input';
import {
  Template,
  TemplateSection,
  TemplateContent,
  TEMPLATE_CATEGORIES,
} from '@/types/templates';

interface TemplateEditorProps {
  template?: Template;
  onSave?: (template: Template) => void;
  onCancel?: () => void;
}

const sectionTypeOptions = [
  { value: 'checklist', label: '✓ Checklist', description: 'Items to verify or complete' },
  { value: 'notes', label: '📝 Notes', description: 'Free-form text content' },
  { value: 'data', label: '📊 Data', description: 'Structured data display' },
  { value: 'questions', label: '❓ Questions', description: 'Investigation questions' },
  { value: 'steps', label: '👣 Steps', description: 'Sequential action steps' },
];

export default function TemplateEditor({
  template,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [type, setType] = useState(template?.type || 'investigation');
  const [category, setCategory] = useState(template?.category || 'phishing');
  const [tags, setTags] = useState(template?.tags.join(', ') || '');
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.content.sections || []
  );
  const [currentSectionType, setCurrentSectionType] = useState('checklist');
  const [currentSectionTitle, setCurrentSectionTitle] = useState('');

  const categories = TEMPLATE_CATEGORIES[type as any] || [];

  const handleAddSection = () => {
    if (!currentSectionTitle.trim()) return;

    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: currentSectionTitle,
      type: currentSectionType as any,
      content: [],
      required: false,
    };

    setSections([...sections, newSection]);
    setCurrentSectionTitle('');
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const handleSaveTemplate = () => {
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }

    const templateToSave: Template = {
      id: template?.id || `template-${Date.now()}`,
      name,
      description,
      type: type as any,
      category,
      content: {
        sections,
        metadata: {
          version: template?.version || '1.0',
          createdAt: template?.createdAt || new Date().toISOString(),
        },
      },
      createdBy: template?.createdBy || 'current-user',
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: template?.isPublic || false,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      version: template?.version || '1.0',
      usageCount: template?.usageCount || 0,
    };

    onSave?.(templateToSave);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Basic Info */}
      <Card variant="default">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Template Name"
              placeholder="e.g., Phishing Investigation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Template Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="investigation">🔍 Investigation</option>
                <option value="response">⚡ Response</option>
                <option value="dashboard">📊 Dashboard</option>
                <option value="report">📋 Report</option>
                <option value="playbook">📖 Playbook</option>
              </select>
            </div>
          </div>

          <Input
            label="Description"
            placeholder="What is this template for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Tags (comma separated)"
              placeholder="e.g., urgent, phishing, executive"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Template Sections */}
      <Card variant="default">
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900">Template Sections</h3>

          {/* Add Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-900">Add New Section</h4>

            <Input
              placeholder="Section title"
              value={currentSectionTitle}
              onChange={(e) => setCurrentSectionTitle(e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Section Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {sectionTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCurrentSectionType(opt.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      currentSectionType === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleAddSection}
              disabled={!currentSectionTitle.trim()}
            >
              Add Section
            </Button>
          </div>

          {/* Sections List */}
          <div className="space-y-2">
            {sections.length === 0 ? (
              <div className="py-8 text-center text-gray-600">
                <p className="text-sm">No sections added yet</p>
              </div>
            ) : (
              sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {index + 1}. {section.title}
                    </div>
                    <Badge variant="info" size="sm" className="mt-1">
                      {section.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSection(section.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSaveTemplate}>
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
