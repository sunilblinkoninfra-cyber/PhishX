/**
 * Quarantine Table Component
 * Displays HOT risk quarantined emails with action buttons
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/types/api';
import {
  RiskBadge,
  StatusBadge,
  Pagination,
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
} from '@/components/common';
import {
  formatDate,
  formatEmail,
  formatRiskScore,
} from '@/utils/formatters';

interface QuarantineTableProps {
  alerts: Alert[];
  loading?: boolean;
  onRelease?: (alertId: string) => Promise<void>;
  onDelete?: (alertId: string) => Promise<void>;
  pagination?: {
    page?: number;
    currentPage?: number;
    pageSize: number;
    total?: number;
    totalItems?: number;
    totalPages?: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function QuarantineTable({
  alerts,
  loading = false,
  onRelease,
  onDelete,
  pagination,
  onPageChange,
  onPageSizeChange,
}: QuarantineTableProps) {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    alertId: string;
    action: 'release' | 'delete';
  } | null>(null);

  const handleRelease = async (alertId: string) => {
    if (!onRelease) return;
    setActionInProgress(alertId);
    try {
      await onRelease(alertId);
      setConfirmDialog(null);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!onDelete) return;
    setActionInProgress(alertId);
    try {
      await onDelete(alertId);
      setConfirmDialog(null);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-red-600"></div>
          <span className="ml-3 text-gray-600">Loading quarantine items...</span>
        </div>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">No quarantined items</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Quarantined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {alerts.map((alert) => (
                <tr
                  key={(alert as any).id || (alert as any).metadata?.id}
                  className="hover:bg-red-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate((alert as any).timestamp || (alert as any).metadata?.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatEmail((alert as any).from || (alert as any).metadata?.sender || 'unknown@phishx.local', 25)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {(alert as any).subject || (alert as any).metadata?.subject || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RiskBadge
                      level={alert.riskLevel}
                      score={(alert as any).riskBreakdown?.overallRisk ?? (alert as any).riskScore}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={alert.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <Link href={`/quarantine/${(alert as any).id || (alert as any).metadata?.id}`}>
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionInProgress === ((alert as any).id || (alert as any).metadata?.id)}
                      isLoading={
                        actionInProgress === ((alert as any).id || (alert as any).metadata?.id) &&
                        confirmDialog?.action === 'release'
                      }
                      onClick={() =>
                        setConfirmDialog({
                          alertId: (alert as any).id || (alert as any).metadata?.id,
                          action: 'release',
                        })
                      }
                    >
                      Release
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={actionInProgress === ((alert as any).id || (alert as any).metadata?.id)}
                      isLoading={
                        actionInProgress === ((alert as any).id || (alert as any).metadata?.id) &&
                        confirmDialog?.action === 'delete'
                      }
                      onClick={() =>
                        setConfirmDialog({
                          alertId: (alert as any).id || (alert as any).metadata?.id,
                          action: 'delete',
                        })
                      }
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <Pagination
            currentPage={pagination.currentPage ?? pagination.page ?? 1}
            totalPages={
              pagination.totalPages ??
              Math.max(
                1,
                Math.ceil(
                  ((pagination.totalItems ?? pagination.total ?? alerts.length) || 0) /
                    Math.max(1, pagination.pageSize)
                )
              )
            }
            totalItems={pagination.totalItems ?? pagination.total ?? alerts.length}
            pageSize={pagination.pageSize}
            onPageChange={onPageChange || (() => {})}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog
          isOpen={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
          title={
            confirmDialog.action === 'release'
              ? 'Release from Quarantine?'
              : 'Permanently Delete?'
          }
          size="sm"
        >
          <DialogBody>
            <p className="text-gray-700 mb-4">
              {confirmDialog.action === 'release'
                ? 'This email will be released from quarantine and delivered to the recipient. This action cannot be undone.'
                : 'This email will be permanently deleted from quarantine. This action cannot be undone.'}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDialog(null)}
              disabled={actionInProgress !== null}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'delete' ? 'danger' : 'primary'}
              onClick={() => {
                if (confirmDialog.action === 'release') {
                  handleRelease(confirmDialog.alertId);
                } else {
                  handleDelete(confirmDialog.alertId);
                }
              }}
              disabled={actionInProgress !== null}
              isLoading={actionInProgress !== null}
            >
              {confirmDialog.action === 'release' ? 'Release' : 'Delete'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}

export default QuarantineTable;
