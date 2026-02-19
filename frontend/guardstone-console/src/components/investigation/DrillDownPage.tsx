'use client';

import React, { useState, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Dialog, { DialogHeader, DialogBody, DialogFooter } from '../common/Dialog';
import StatusChangeForm from '../forms/StatusChangeForm';
import RiskBreakdown from './RiskBreakdown';
import RelatedAlerts from './RelatedAlerts';
import { Alert, AlertStatus } from '@/types/api';
import { formatDate } from '@/utils/formatters';

interface DrillDownPageProps {
  alert: Alert;
  onStatusChange: (newStatus: AlertStatus, notes: string) => Promise<void>;
  onAddNote: (alertId: string, note: string) => Promise<void>;
  loading?: boolean;
}

const statusColors: Partial<Record<AlertStatus, string>> = {
  NEW: 'bg-green-100 text-green-900',
  INVESTIGATING: 'bg-blue-100 text-blue-900',
  CONFIRMED: 'bg-red-100 text-red-900',
  RESOLVED: 'bg-gray-100 text-gray-900',
  FALSE_POSITIVE: 'bg-yellow-100 text-yellow-900',
};

export default function DrillDownPage({
  alert,
  onStatusChange,
  onAddNote,
  loading = false,
}: DrillDownPageProps) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return;

    setIsAddingNote(true);
    try {
      await onAddNote(alert.id, noteText);
      setNoteText('');
      setShowAddNote(false);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsAddingNote(false);
    }
  }, [alert.id, noteText, onAddNote]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="elevated">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Alert Details</h1>
              <Badge variant={alert.riskLevel === 'HOT' ? 'error' : alert.riskLevel === 'WARM' ? 'warning' : 'info'}>
                {alert.riskLevel}
              </Badge>
            </div>
            <p className="text-gray-600">
              <span className="font-semibold">{alert.from}</span> - {alert.subject}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              ID: <span className="font-mono">{alert.id}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowStatusForm(true)}
              disabled={loading}
            >
              Change Status
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowAddNote(true)}
              disabled={loading}
            >
              Add Note
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Email Details */}
        <div className="col-span-2 space-y-6">
          {/* Email Metadata */}
          <Card>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Email Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold text-gray-900">{alert.from}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-semibold text-gray-900">{alert.to}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-semibold text-gray-900">{alert.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Received</p>
                  <p className="font-semibold text-gray-900">{formatDate(alert.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant="primary" className={statusColors[alert.status] || 'bg-gray-100 text-gray-900'}>
                    {alert.status}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Email Body Preview */}
          <Card>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Email Body Preview</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-40 overflow-y-auto text-sm text-gray-700">
                {alert.bodyPreview || 'No content available'}
              </div>
            </div>
          </Card>

          {/* Risk Analysis */}
          <Card>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Risk Analysis</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Overall Risk Score</p>
                    <p className="text-2xl font-bold text-red-600">{alert.riskScore.toFixed(1)}/10</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        alert.riskScore >= 7 ? 'bg-red-500' : alert.riskScore >= 3 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(alert.riskScore / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-2">Detected Threats:</p>
                  <ul className="space-y-1">
                    <li>• Suspicious sender domain</li>
                    <li>• Phishing content patterns detected</li>
                    <li>• Malicious URL found in body</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* URLs & Attachments */}
          <Card>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">URLs & Attachments</h3>
              <div className="space-y-2">
                {alert.urls && alert.urls.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">URLs ({alert.urls.length})</p>
                    <div className="space-y-1">
                      {alert.urls.map((url, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          <span className="text-gray-600">🔗</span>
                          <span className="truncate font-mono text-blue-600 hover:underline cursor-pointer">
                            {url}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {alert.attachments && alert.attachments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Attachments ({alert.attachments.length})</p>
                    <div className="space-y-1">
                      {alert.attachments.map((attachment, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          <span className="text-gray-600">📎</span>
                          <span className="font-mono text-gray-700">{attachment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Risk Breakdown & Related */}
        <div className="space-y-6">
          <RiskBreakdown alert={alert} />
          <RelatedAlerts currentAlertId={alert.id} />
        </div>
      </div>

      {/* Status Change Form */}
      <StatusChangeForm
        isOpen={showStatusForm}
        onClose={() => setShowStatusForm(false)}
        onSubmit={onStatusChange}
        currentStatus={alert.status}
        alertId={alert.id}
      />

      {/* Add Note Dialog */}
      <Dialog
        isOpen={showAddNote}
        onClose={() => !isAddingNote && setShowAddNote(false)}
        title="Add Investigation Note"
        size="md"
        closeButton={!isAddingNote}
      >
        <DialogBody className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={isAddingNote}
            placeholder="Enter your investigation notes..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
          <p className="text-xs text-gray-500">
            Your note will be visible in the audit trail and attached to this alert
          </p>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowAddNote(false)}
            disabled={isAddingNote}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddNote}
            isLoading={isAddingNote}
            disabled={!noteText.trim()}
          >
            Add Note
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
