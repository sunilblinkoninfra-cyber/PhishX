'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import QuarantineTable from '@/components/tables/QuarantineTable';
import FilterForm, { FilterState } from '@/components/forms/FilterForm';
import SearchForm from '@/components/forms/SearchForm';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { Alert } from '@/types/api';
import Badge from '@/components/common/Badge';

export default function QuarantinePage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { alerts, setAlerts, loading, setLoading } = useAlertStore() as any;

  const alertsArray: Alert[] = Array.isArray(alerts)
    ? alerts
    : Array.from((alerts as Map<string, Alert>)?.values?.() ?? []);

  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>(alertsArray);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [filters, setFilters] = useState<FilterState>({
    riskLevels: ['HOT'],
    statuses: [],
    classifications: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch quarantined alerts on component mount
  useEffect(() => {
    const fetchQuarantined = async () => {
      setLoading(true);
      try {
        const response = await APIClient.alerts.list({
          riskLevels: ['HOT'],
          limit: 100,
          offset: 0,
        });
        setAlerts(response.items);
        addToast('Quarantine list loaded successfully', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load quarantine';
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuarantined();
  }, [setAlerts, setLoading, addToast]);

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
      riskLevels: ['HOT'],
      statuses: [],
      classifications: [],
    });
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...alertsArray];

    // Apply risk level filter (HOT only)
    result = result.filter((alert) => filters.riskLevels.includes(alert.riskLevel));

    // Apply status filter
    if (filters.statuses.length > 0) {
      result = result.filter((alert) => filters.statuses.includes(alert.status));
    }

    // Apply classification filter
    if (filters.classifications.length > 0) {
      result = result.filter((alert) =>
        filters.classifications.includes(alert.classification)
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((alert) => {
        switch (searchType) {
          case 'sender':
            return alert.from.toLowerCase().includes(query);
          case 'subject':
            return alert.subject.toLowerCase().includes(query);
          case 'body':
            return alert.bodyPreview?.toLowerCase().includes(query) ?? false;
          case 'url':
            return alert.urls?.some((url) => url.toLowerCase().includes(query)) ?? false;
          case 'all':
          default:
            return (
              alert.from.toLowerCase().includes(query) ||
              alert.subject.toLowerCase().includes(query) ||
              alert.to.toLowerCase().includes(query)
            );
        }
      });
    }

    setFilteredAlerts(result);
    setCurrentPage(1);
  }, [alertsArray, filters, searchQuery, searchType]);

  // Calculate pagination
  const totalItems = filteredAlerts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedAlerts = filteredAlerts.slice(startIdx, endIdx);

  // Handle release
  const handleRelease = async (alertId: string) => {
    try {
      await APIClient.alerts.release(alertId, {
        releasedBy: user?.id || 'unknown',
      });

      // Update local store
      const updatedAlerts = alertsArray.filter((a) => a.id !== alertId);
      setAlerts(updatedAlerts);

      addToast('Alert released successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to release alert';
      addToast(message, 'error');
      throw error;
    }
  };

  // Handle delete
  const handleDelete = async (alertId: string) => {
    try {
      await APIClient.alerts.delete(alertId, {
        deletedBy: user?.id || 'unknown',
      });

      // Update local store
      const updatedAlerts = alertsArray.filter((a) => a.id !== alertId);
      setAlerts(updatedAlerts);

      addToast('Alert permanently deleted', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete alert';
      addToast(message, 'error');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quarantine</h1>
          <p className="text-gray-600 mt-1">
            Blocked emails requiring immediate action (Hot Risk: 7.0-10.0)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Quarantined Emails</p>
              <p className="text-3xl font-bold text-red-600">{totalItems}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-bold"><span className="text-red-600">🔴 CRITICAL</span></p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Risk Level</p>
              <p className="text-3xl font-bold text-red-600">🔴 HOT</p>
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

      {/* Alert Banner */}
      {totalItems > 0 && (
        <Card variant="default" className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-bold text-red-900">Immediate Action Required</h3>
              <p className="text-sm text-red-700">
                You have {totalItems} high-risk email{totalItems !== 1 ? 's' : ''} in quarantine that require review and action.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <SearchForm
            onSearch={handleSearch}
            onClear={() => {
              setSearchQuery('');
              setSearchType('all');
            }}
            placeholder="Search quarantined emails..."
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

      {/* Quarantine Table */}
      <Card variant="default">
        <div className="overflow-x-auto">
          <QuarantineTable
            alerts={paginatedAlerts}
            loading={loading}
            onRelease={handleRelease}
            onDelete={handleDelete}
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
              Showing {startIdx + 1} to {endIdx} of {totalItems} quarantined emails
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
          <p className="text-4xl mb-2">✅</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Quarantine is Empty</h3>
          <p className="text-gray-600">All emails are safe. No quarantined items at this time.</p>
        </Card>
      )}
    </div>
  );
}
