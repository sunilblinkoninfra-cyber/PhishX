'use client';

import React, { useState, useCallback } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import Dialog, { DialogHeader, DialogBody, DialogFooter } from '../common/Dialog';
import { AlertStatus } from '@/types/api';

interface StatusChangeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newStatus: AlertStatus, notes: string) => Promise<void>;
  currentStatus: AlertStatus;
  alertId: string;
}

const statusOptions: { value: AlertStatus; label: string; description: string }[] = [
  { value: 'NEW', label: 'New', description: 'Newly detected alert' },
  { value: 'INVESTIGATING', label: 'Investigating', description: 'Currently under review' },
  { value: 'CONFIRMED', label: 'Confirmed', description: 'Confirmed as phishing' },
  { value: 'RESOLVED', label: 'Resolved', description: 'Case closed' },
  { value: 'FALSE_POSITIVE', label: 'False Positive', description: 'Legitimate email' },
];

export default function StatusChangeForm({
  isOpen,
  onClose,
  onSubmit,
  currentStatus,
  alertId,
}: StatusChangeFormProps) {
  const [newStatus, setNewStatus] = useState<AlertStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewStatus(e.target.value as AlertStatus);
    setError(null);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('Notes are required when changing status');
      return;
    }

    if (newStatus === currentStatus && !notes.trim()) {
      setError('No changes made');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(newStatus, notes);
      setNotes('');
      setNewStatus(currentStatus);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes('');
      setNewStatus(currentStatus);
      setError(null);
      onClose();
    }
  };

  const currentStatusLabel = statusOptions.find(
    (s) => s.value === currentStatus
  )?.label;

  const newStatusLabel = statusOptions.find(
    (s) => s.value === newStatus
  )?.label;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Alert Status"
      size="md"
      closeButton={!isSubmitting}
    >
      <DialogBody className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Alert ID: <span className="font-mono font-semibold">{alertId}</span>
          </p>
          <p className="text-sm text-gray-600">
            Current Status: <span className="font-semibold text-blue-600">{currentStatusLabel}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="status-select" className="block text-sm font-semibold text-gray-900">
            New Status <span className="text-red-500">*</span>
          </label>
          <select
            id="status-select"
            value={newStatus}
            onChange={handleStatusChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-900">
            Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={handleNotesChange}
            disabled={isSubmitting}
            placeholder="Provide details about this status change (e.g., investigation findings, false positive reason, resolution details)"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
          <p className="text-xs text-gray-500">
            Notes will be recorded in the audit trail
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {newStatus !== currentStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Status will change from <span className="font-semibold">{currentStatusLabel}</span> to{' '}
              <span className="font-semibold">{newStatusLabel}</span>
            </p>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex gap-2">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!notes.trim()}
        >
          {isSubmitting ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
