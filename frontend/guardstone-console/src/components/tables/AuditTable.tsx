/**
 * Audit Table Component
 * Displays audit trail with user actions and timestamps
 */

'use client';

import { AuditEntry } from '@/types/api';
import {
  Pagination,
  Card,
} from '@/components/common';
import {
  formatDate,
} from '@/utils/formatters';

interface AuditTableProps {
  entries: AuditEntry[];
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

export function AuditTable({
  entries,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
}: AuditTableProps) {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'VIEWED':
        return 'text-blue-600 bg-blue-50';
      case 'INVESTIGATED':
        return 'text-blue-600 bg-blue-50';
      case 'CONFIRMED':
        return 'text-red-600 bg-red-50';
      case 'RELEASED':
        return 'text-green-600 bg-green-50';
      case 'DELETED':
        return 'text-red-600 bg-red-50';
      case 'EXPORTED':
        return 'text-purple-600 bg-purple-50';
      case 'NOTED':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit trail...</span>
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">No audit entries found</p>
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
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(entry.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.userEmail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getActionColor(
                      entry.action
                    )}`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                  {entry.notes || '-'}
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
                ((pagination.totalItems ?? pagination.total ?? entries.length) || 0) /
                  Math.max(1, pagination.pageSize)
              )
            )
          }
          totalItems={pagination.totalItems ?? pagination.total ?? entries.length}
          pageSize={pagination.pageSize}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </Card>
  );
}

export default AuditTable;
