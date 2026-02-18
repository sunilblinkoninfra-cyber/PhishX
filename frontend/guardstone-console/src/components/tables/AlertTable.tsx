/**
 * Alert Table Component
 * Displays WARM risk alerts for active investigation
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Alert } from '@/types';
import {
  RiskBadge,
  StatusBadge,
  Pagination,
  Button,
  Card,
} from '@/components/common';
import {
  formatDate,
  formatEmail,
  formatRiskScore,
} from '@/utils/formatters';

interface AlertTableProps {
  alerts: Alert[];
  loading?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function AlertTable({
  alerts,
  loading = false,
  onSelectionChange,
  pagination,
  onPageChange,
  onPageSizeChange,
}: AlertTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(alerts.map((a) => a.metadata.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(alertId);
    } else {
      newSelected.delete(alertId);
    }
    setSelectedIds(newSelected);
  };

  useMemo(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const allSelected =
    alerts.length > 0 && selectedIds.size === alerts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < alerts.length;

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading alerts...</span>
        </div>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">No alerts found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {alerts.map((alert) => (
              <tr
                key={alert.metadata.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(alert.metadata.id)}
                    onChange={(e) =>
                      handleSelectAlert(alert.metadata.id, e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(alert.metadata.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatEmail(alert.metadata.sender, 25)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {alert.metadata.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RiskBadge
                    level={alert.riskLevel}
                    score={alert.riskBreakdown.overallRisk}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={alert.status} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/alerts/${alert.metadata.id}`}>
                    <Button variant="primary" size="sm">
                      Investigate
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.pageSize)}
          totalItems={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </Card>
  );
}

export default AlertTable;
