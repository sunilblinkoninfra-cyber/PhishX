'use client';

import React, { useState, useCallback } from 'react';
import Dialog, { DialogHeader, DialogBody, DialogFooter } from '../common/Dialog';
import Button from '../common/Button';
import Checkbox from '../common/Checkbox';
import { ExportFormat } from '@/types/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => Promise<void>;
  selectedCount: number;
  loading?: boolean;
}

export interface ExportConfig {
  format: ExportFormat;
  fields: string[];
  includeNotes: boolean;
  includeAuditTrail: boolean;
}

const fieldOptions = [
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'from', label: 'From (Sender)' },
  { id: 'to', label: 'To (Recipient)' },
  { id: 'subject', label: 'Subject' },
  { id: 'riskScore', label: 'Risk Score' },
  { id: 'riskLevel', label: 'Risk Level' },
  { id: 'status', label: 'Status' },
  { id: 'classification', label: 'Classification' },
  { id: 'urls', label: 'URLs' },
  { id: 'attachments', label: 'Attachments' },
];

const defaultFields = ['timestamp', 'from', 'subject', 'riskScore', 'status'];

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  selectedCount,
  loading = false,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('CSV');
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultFields);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldToggle = useCallback((fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFields.length === fieldOptions.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(fieldOptions.map((f) => f.id));
    }
  }, [selectedFields.length]);

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      await onExport({
        format,
        fields: selectedFields,
        includeNotes,
        includeAuditTrail,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setSelectedFields(defaultFields);
      setFormat('CSV');
      setIncludeNotes(true);
      setIncludeAuditTrail(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Alerts"
      size="md"
      closeButton={!isExporting}
    >
      <DialogBody className="space-y-6">
        {/* Selected Count */}
        <p className="text-sm text-gray-600">
          Exporting <span className="font-semibold">{selectedCount}</span> alert{selectedCount !== 1 ? 's' : ''}
        </p>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            {(['CSV', 'PDF'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                disabled={isExporting}
                className={`px-4 py-2 rounded-lg border-2 transition-colors font-medium ${
                  format === fmt
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Field Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-900">Fields to Include</label>
            <button
              onClick={handleSelectAll}
              disabled={isExporting}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {selectedFields.length === fieldOptions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200">
            {fieldOptions.map((field) => (
              <label key={field.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedFields.includes(field.id)}
                  onChange={() => handleFieldToggle(field.id)}
                  disabled={isExporting}
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              disabled={isExporting}
            />
            <span className="text-sm text-gray-700">Include investigation notes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={includeAuditTrail}
              onChange={(e) => setIncludeAuditTrail(e.target.checked)}
              disabled={isExporting}
            />
            <span className="text-sm text-gray-700">Include audit trail</span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex gap-2">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isExporting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={selectedFields.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
