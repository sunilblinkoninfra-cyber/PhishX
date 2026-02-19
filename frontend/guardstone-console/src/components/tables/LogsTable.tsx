/**
 * Logs Table Component
 * Displays COLD risk informational logs (read-only)
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Alert } from '@/types/api';
import {
  RiskBadge,
  Pagination,
  Button,
  Card,
} from '@/components/common';
import {
  formatDate,
  formatEmail,
} from '@/utils/formatters';

interface LogsTableProps {
  logs: Alert[];
  loading?: boolean;
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

export function LogsTable({
  logs,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
}: LogsTableProps) {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading logs...</span>
        </div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">No logs found</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Classification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {logs.map((log) => (
              <tr
                key={(log as any).id || (log as any).metadata?.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate((log as any).timestamp || (log as any).metadata?.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatEmail((log as any).from || (log as any).metadata?.sender || 'unknown@phishx.local', 25)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(log as any).to || (log as any).metadata?.recipient?.[0] || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {(log as any).subject || (log as any).metadata?.subject || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RiskBadge level={log.riskLevel} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {(log as any).classification || (log as any).metadata?.classifications?.[0] || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/logs/${(log as any).id || (log as any).metadata?.id}`}>
                    <Button variant="ghost" size="sm">
                      View
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
                ((pagination.totalItems ?? pagination.total ?? logs.length) || 0) /
                  Math.max(1, pagination.pageSize)
              )
            )
          }
          totalItems={pagination.totalItems ?? pagination.total ?? logs.length}
          pageSize={pagination.pageSize}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </Card>
  );
}

export default LogsTable;
