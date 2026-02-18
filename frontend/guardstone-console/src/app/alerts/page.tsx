'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import AlertTable from '@/components/tables/AlertTable';
import FilterForm, { FilterState } from '@/components/forms/FilterForm';
import SearchForm from '@/components/forms/SearchForm';
import ExportModal, { ExportConfig } from '@/components/export/ExportModal';
import ExportHandler from '@/components/export/ExportHandler';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { Alert } from '@/types/api';
import Badge from '@/components/common/Badge';

export default function AlertsPage() {
  const router = useRouter();
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
    riskLevels: ['WARM'],
    statuses: [],
    classifications: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch alerts on component mount
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const response = await APIClient.alerts.list({
          riskLevels: ['WARM'],
          limit: 100,
          offset: 0,
        });
        setAlerts(response.items);
        addToast('Alerts loaded successfully', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load alerts';
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
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
      riskLevels: ['WARM'],
      statuses: [],
      classifications: [],
    });
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...alertsArray];

    // Apply risk level filter (WARM for this view)
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
    setSelectedAlerts(new Set());
  }, [alertsArray, filters, searchQuery, searchType]);

  // Calculate pagination
  const totalItems = filteredAlerts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedAlerts = filteredAlerts.slice(startIdx, endIdx);

  // Handle export
  const handleExport = async (config: ExportConfig) => {
    try {
      const selectedItems = selectedAlerts.size > 0
        ? paginatedAlerts.filter((a) => selectedAlerts.has(a.id))
        : paginatedAlerts;

      await APIClient.exports.create({
        format: config.format,
        items: selectedItems.map((a) => a.id),
        fields: config.fields,
        includeNotes: config.includeNotes,
        includeAuditTrail: config.includeAuditTrail,
      });

      addToast('Export job created successfully', 'success');
      setShowExportModal(false);
      setSelectedAlerts(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      addToast(message, 'error');
      throw error;
    }
  };

  const handleInvestigate = (alertId: string) => {
    router.push(`/alerts/${alertId}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Alerts</h1>
          <p className="text-gray-600 mt-1">
            Active alerts requiring investigation (Warm Risk: 3.0-7.0)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-3xl font-bold text-yellow-600">{totalItems}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Selected</p>
              <p className="text-3xl font-bold text-blue-600">{selectedAlerts.size}</p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Risk Level</p>
              <p className="text-3xl font-bold text-yellow-600">🟡 WARM</p>
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
            placeholder="Search alerts by sender, subject, or URL..."
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

      {/* Bulk Actions */}
      {selectedAlerts.size > 0 && (
        <Card variant="elevated" className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="primary">{selectedAlerts.size} selected</Badge>
              <p className="text-sm text-gray-700">
                You have selected <span className="font-semibold">{selectedAlerts.size}</span> alert
                {selectedAlerts.size !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowExportModal(true)}
              disabled={loading}
            >
              📥 Export Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Alerts Table */}
      <Card variant="default">
        <div className="overflow-x-auto">
          <AlertTable
            alerts={paginatedAlerts}
            loading={loading}
            onSelectionChange={setSelectedAlerts}
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
              Showing {startIdx + 1} to {endIdx} of {totalItems} alerts
            </p>
            <p className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Card>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        selectedCount={selectedAlerts.size || paginatedAlerts.length}
      />
    </div>
  );
}
