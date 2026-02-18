'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LogsTable from '@/components/tables/LogsTable';
import FilterForm, { FilterState } from '@/components/forms/FilterForm';
import SearchForm from '@/components/forms/SearchForm';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { Log } from '@/types/api';

export default function LogsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { logs, setLogs, loading, setLoading } = useAlertStore() as any;

  const logsArray: Log[] = Array.isArray(logs) ? logs : [];

  const [filteredLogs, setFilteredLogs] = useState<Log[]>(logsArray);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [filters, setFilters] = useState<FilterState>({
    riskLevels: ['COLD'],
    statuses: [],
    classifications: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch logs on component mount
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await APIClient.logs.list({
          riskLevels: ['COLD'],
          limit: 100,
          offset: 0,
        });
        setLogs(response.items);
        addToast('Logs loaded successfully', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load logs';
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [setLogs, setLoading, addToast]);

  // Handle search
  const handleSearch = useCallback((query: string, type: string) => {
    setSearchQuery(query);
    setSearchType(type);
    setCurrentPage(1);
  }, []);

  // Handle filter changes
  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      riskLevels: ['COLD'],
      statuses: [],
      classifications: [],
    });
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...logsArray];

    // Apply risk level filter (COLD only for this view)
    result = result.filter((log) => filters.riskLevels.includes(log.riskLevel));

    // Apply status filter
    if (filters.statuses.length > 0) {
      result = result.filter((log) => filters.statuses.includes(log.status));
    }

    // Apply classification filter
    if (filters.classifications.length > 0) {
      result = result.filter((log) =>
        filters.classifications.includes(log.classification)
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((log) => {
        switch (searchType) {
          case 'sender':
            return log.from.toLowerCase().includes(query);
          case 'subject':
            return log.subject.toLowerCase().includes(query);
          case 'body':
            return log.bodyPreview?.toLowerCase().includes(query) ?? false;
          case 'all':
          default:
            return (
              log.from.toLowerCase().includes(query) ||
              log.subject.toLowerCase().includes(query) ||
              log.to.toLowerCase().includes(query)
            );
        }
      });
    }

    setFilteredLogs(result);
    setCurrentPage(1);
  }, [logsArray, filters, searchQuery, searchType]);

  // Calculate pagination
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedLogs = filteredLogs.slice(startIdx, endIdx);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">
            Review all informational email logs (Cold Risk: 0.0-3.0)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-3xl font-bold text-blue-600">{totalItems}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Risk Level</p>
              <p className="text-3xl font-bold text-blue-600">🔵 COLD</p>
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

      {/* Search and Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <SearchForm
            onSearch={handleSearch}
            onClear={() => {
              setSearchQuery('');
              setSearchType('all');
            }}
            placeholder="Search logs by sender, subject, or recipient..."
            loading={loading}
          />
        </div>
        <div>
          <FilterForm
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            loading={loading}
          />
        </div>
      </div>

      {/* Logs Table */}
      <Card variant="default">
        <div className="overflow-x-auto">
          <LogsTable
            logs={paginatedLogs}
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
              Showing {startIdx + 1} to {endIdx} of {totalItems} logs
            </p>
            <p className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
