/**
 * Alert Table Component
 * Displays WARM risk alerts for active investigation
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Alert } from '@/types/api';
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
  onSelectionChange?: (selectedIds: Set<string>) => void;
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

export function AlertTable({
  alerts,
  loading = false,
  onSelectionChange,
  pagination,
  onPageChange,
  onPageSizeChange,
}: AlertTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getAlertId = (alert: Alert): string => {
    return (alert as any).id || (alert as any).metadata?.id || '';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(alerts.map((a) => getAlertId(a)).filter(Boolean)));
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

  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const allSelected =
    alerts.length > 0 && selectedIds.size === alerts.length;

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
                key={getAlertId(alert)}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getAlertId(alert))}
                    onChange={(e) =>
                      handleSelectAlert(getAlertId(alert), e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </td>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/alerts/${getAlertId(alert)}`}>
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
  );
}

export default AlertTable;
