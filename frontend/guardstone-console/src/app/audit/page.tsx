'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/common/Card';
import AuditTable from '@/components/tables/AuditTable';
import FilterForm from '@/components/forms/FilterForm';
import SearchForm from '@/components/forms/SearchForm';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { AuditEntry } from '@/types/api';

export default function AuditPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  // Fetch audit trail on component mount
  useEffect(() => {
    const fetchAuditTrail = async () => {
      setLoading(true);
      try {
        const response = await APIClient.audit.list({
          limit: 500,
          offset: 0,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });
        setAuditEntries(response.items);
        addToast('Audit trail loaded successfully', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load audit trail';
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
  }, [addToast]);

  // Handle search
  const handleSearch = useCallback((query: string, type: string) => {
    setSearchQuery(query);
    setSearchType(type);
    setCurrentPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchType('all');
    setCurrentPage(1);
  }, []);

  // Apply search filter
  useEffect(() => {
    let result = [...auditEntries];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((entry) => {
        switch (searchType) {
          case 'sender':
            return entry.userName.toLowerCase().includes(query);
          case 'subject':
            return entry.action.toLowerCase().includes(query);
          case 'all':
          default:
            return (
              entry.userName.toLowerCase().includes(query) ||
              entry.action.toLowerCase().includes(query) ||
              entry.notes?.toLowerCase().includes(query) ||
              false
            );
        }
      });
    }

    setFilteredEntries(result);
    setCurrentPage(1);
  }, [auditEntries, searchQuery, searchType]);

  // Calculate pagination
  const totalItems = filteredEntries.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedEntries = filteredEntries.slice(startIdx, endIdx);

  // Map audit actions to badges
  const actionSummary: Record<string, number> = {};
  auditEntries.forEach((entry) => {
    actionSummary[entry.action] = (actionSummary[entry.action] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">
            Complete log of all actions and investigations performed in the system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-3xl font-bold text-blue-600">{totalItems}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Unique Actions</p>
              <p className="text-3xl font-bold text-purple-600">{Object.keys(actionSummary).length}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Time Range</p>
              <p className="text-lg font-bold text-gray-900">Last 30 days</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Current User</p>
              <p className="text-lg font-bold text-gray-900 truncate">{user?.email || 'Unknown'}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Summary */}
      {Object.keys(actionSummary).length > 0 && (
        <Card variant="default">
          <div className="space-y-2 mb-4">
            <h3 className="font-semibold text-gray-900">Action Summary</h3>
            <p className="text-sm text-gray-600">Most common audit actions</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(actionSummary)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([action, count]) => (
                <div
                  key={action}
                  className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                >
                  <p className="text-xs font-semibold text-gray-700 uppercase">{action}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{count}</p>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <SearchForm
            onSearch={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search audit log by user, action, or notes..."
            searchTypes={[
              { value: 'all', label: 'All Fields' },
              { value: 'sender', label: 'User' },
              { value: 'subject', label: 'Action' },
            ]}
            loading={loading}
          />
        </div>
        <div>
          <Card variant="default" className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Filter Options</h3>
            <p className="text-xs text-gray-600">
              Use the search above to filter audit entries by user, action, or notes.
            </p>
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                A comprehensive audit trail is maintained for compliance and investigation purposes.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Table */}
      <Card variant="default">
        <div className="overflow-x-auto">
          <AuditTable
            entries={paginatedEntries}
            loading={loading}
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              pageSize,
            }}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      {/* Footer Info */}
      {totalItems > 0 && (
        <Card variant="outlined">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIdx + 1} to {endIdx} of {totalItems} audit entries
            </p>
            <p className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {totalItems === 0 && !loading && (
        <Card variant="elevated" className="text-center py-12">
          <p className="text-4xl mb-2">📋</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Audit Entries</h3>
          <p className="text-gray-600">No actions have been logged yet.</p>
        </Card>
      )}

      {/* Compliance Notice */}
      <Card variant="outlined" className="bg-gray-50">
        <div className="flex gap-3">
          <span className="text-2xl">🔒</span>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Compliance Notice</p>
            <p className="text-gray-600">
              All actions are logged for compliance and audit purposes. Audit trail entries are
              retained according to your organization's data retention policy.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
