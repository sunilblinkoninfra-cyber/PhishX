'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { TemplateList, TemplateEditor, TemplatePreview } from '@/components/templates';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { Template, PREBUILT_TEMPLATES } from '@/types/templates';

type ViewMode = 'list' | 'editor' | 'preview';

export default function TemplatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<Template[]>(PREBUILT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setViewMode('editor');
    setShowModal(true);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setViewMode('preview');
    setShowModal(true);
  };

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setViewMode('editor');
    setShowModal(true);
  };

  const handleSaveTemplate = (template: Template) => {
    const existingIndex = templates.findIndex((t) => t.id === template.id);
    if (existingIndex >= 0) {
      const updated = [...templates];
      updated[existingIndex] = template;
      setTemplates(updated);
    } else {
      setTemplates([...templates, template]);
    }
    setShowModal(false);
    setViewMode('list');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter((t) => t.id !== templateId));
    }
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      const updated = { ...selectedTemplate, usageCount: selectedTemplate.usageCount + 1 };
      handleSaveTemplate(updated);
    }
    setShowModal(false);
  };

  return (
    <PageLayout
      title="Templates"
      description="Manage investigation templates, response playbooks, and report layouts"
    >
      <div className="space-y-6">
        {/* Header with Action */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
            <p className="text-gray-600 mt-1">
              {templates.length} templates available
            </p>
          </div>
          <Button variant="primary" onClick={handleCreateTemplate}>
            + Create Template
          </Button>
        </div>

        {/* Template List */}
        <TemplateList
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setViewMode('list');
        }}
        title={
          viewMode === 'editor'
            ? selectedTemplate
              ? 'Edit Template'
              : 'Create New Template'
            : 'Template Preview'
        }
        maxWidth="4xl"
      >
        {viewMode === 'editor' && (
          <TemplateEditor
            template={selectedTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowModal(false);
              setViewMode('list');
            }}
          />
        )}

        {viewMode === 'preview' && selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            onUse={handleUseTemplate}
            onEdit={() => {
              setViewMode('editor');
            }}
            onClose={() => {
              setShowModal(false);
              setViewMode('list');
            }}
          />
        )}
      </Modal>
    </PageLayout>
  );
}
