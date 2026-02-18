/**
 * Zustand Alert Store
 * Centralized state management for alerts across the application
 */

import { create } from 'zustand';
import { Alert, AlertStoreState, AlertFilter, PaginationParams, AlertStatus, AuditEntry } from '@/types';

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: new Map(),
  selectedAlert: null,
  filter: {},
  currentPage: 1,
  pageSize: 25,
  loading: false,
  error: null,
  totalAlerts: 0,

  // Fetch alerts from backend
  fetchAlerts: async (params: PaginationParams & AlertFilter) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortOrder && { sortOrder: params.sortOrder }),
        ...(params.riskLevel && { riskLevel: params.riskLevel.join(',') }),
        ...(params.status && { status: params.status.join(',') }),
        ...(params.sender && { sender: params.sender }),
        ...(params.searchQuery && { q: params.searchQuery }),
      });

      const response = await fetch(`/api/alerts?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }

      const data = await response.json();
      const alertsMap = new Map(data.data.map((alert: Alert) => [alert.metadata.id, alert]));

      set({
        alerts: alertsMap,
        totalAlerts: data.total,
        currentPage: params.page,
        pageSize: params.pageSize,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: {
          code: 'FETCH_ALERTS_ERROR',
          message: err.message || 'Failed to fetch alerts',
        },
        loading: false,
      });
    }
  },

  // Select single alert for investigation
  selectAlert: async (alertId: string) => {
    set({ loading: true, error: null });
    try {
      const existingAlert = get().alerts.get(alertId);
      if (existingAlert) {
        set({ selectedAlert: existingAlert, loading: false });
        return;
      }

      const response = await fetch(`/api/alerts/${alertId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alert: ${response.status}`);
      }

      const alert = await response.json();
      set({ selectedAlert: alert, loading: false });
    } catch (err: any) {
      set({
        error: {
          code: 'SELECT_ALERT_ERROR',
          message: err.message || 'Failed to select alert',
        },
        loading: false,
      });
    }
  },

  // Update alert (e.g., add to quarantine)
  updateAlert: async (alertId: string, updates: Partial<Alert>) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update alert: ${response.status}`);
      }

      const updatedAlert = await response.json();
      const newAlerts = new Map(get().alerts);
      newAlerts.set(alertId, updatedAlert);

      set({
        alerts: newAlerts,
        selectedAlert: get().selectedAlert?.metadata.id === alertId ? updatedAlert : get().selectedAlert,
      });
    } catch (err: any) {
      set({
        error: {
          code: 'UPDATE_ALERT_ERROR',
          message: err.message || 'Failed to update alert',
        },
      });
    }
  },

  // Add notes to alert (required for decisions)
  addNotesToAlert: async (alertId: string, notes: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add notes: ${response.status}`);
      }

      const auditEntry: AuditEntry = await response.json();
      const alert = get().selectedAlert;

      if (alert) {
        const updatedAlert = {
          ...alert,
          investigationNotes: notes,
          auditHistory: [...alert.auditHistory, auditEntry],
        };

        const newAlerts = new Map(get().alerts);
        newAlerts.set(alertId, updatedAlert);

        set({
          alerts: newAlerts,
          selectedAlert: updatedAlert,
        });
      }

      return auditEntry;
    } catch (err: any) {
      set({
        error: {
          code: 'ADD_NOTES_ERROR',
          message: err.message || 'Failed to add notes',
        },
      });
      throw err;
    }
  },

  // Change alert status (with audit trail)
  changeAlertStatus: async (alertId: string, newStatus: AlertStatus, notes: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to change status: ${response.status}`);
      }

      const updatedAlert = await response.json();
      const newAlerts = new Map(get().alerts);
      newAlerts.set(alertId, updatedAlert);

      set({
        alerts: newAlerts,
        selectedAlert: get().selectedAlert?.metadata.id === alertId ? updatedAlert : get().selectedAlert,
      });
    } catch (err: any) {
      set({
        error: {
          code: 'CHANGE_STATUS_ERROR',
          message: err.message || 'Failed to change status',
        },
      });
    }
  },

  // Apply filter and re-query
  queryAlerts: (filter: AlertFilter) => {
    set({ filter, currentPage: 1 });
    const state = get();
    state.fetchAlerts({
      page: 1,
      pageSize: state.pageSize,
      ...filter,
    });
  },

  // Pagination
  setPage: (page: number) => {
    const state = get();
    state.fetchAlerts({
      page,
      pageSize: state.pageSize,
      ...state.filter,
    });
  },

  setPageSize: (size: number) => {
    const state = get();
    state.fetchAlerts({
      page: 1,
      pageSize: size,
      ...state.filter,
    });
  },

  // Clear errors
  clearError: () => set({ error: null }),
}));

export const alertStore = useAlertStore;
