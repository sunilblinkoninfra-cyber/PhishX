/**
 * Lightweight alert store used by page-level UI routes.
 * Keeps frontend state aligned with backend compatibility endpoints.
 */

import { create } from 'zustand';
import { APIClient } from '@/services/apiClient';
import { Alert, AlertStatus, ListParams } from '@/types/api';

interface StoreError {
  code: string;
  message: string;
}

interface AlertStoreState {
  alerts: Alert[];
  logs: Alert[];
  selectedAlert: Alert | null;
  filter: Record<string, any>;
  currentPage: number;
  pageSize: number;
  pagination: {
    page: number;
    pageSize: number;
    totalAlerts: number;
  };
  loading: boolean;
  error: StoreError | null;
  totalAlerts: number;

  setAlerts: (alerts: Alert[]) => void;
  setLogs: (logs: Alert[]) => void;
  setLoading: (loading: boolean) => void;
  fetchAlerts: (params: ListParams & Record<string, any>) => Promise<void>;
  selectAlert: (alertId: string) => Promise<void>;
  updateAlert: (alertId: string, updates: Partial<Alert>) => Promise<void>;
  addNotesToAlert: (alertId: string, notes: string) => Promise<any>;
  changeAlertStatus: (alertId: string, newStatus: AlertStatus, notes: string) => Promise<void>;
  queryAlerts: (filter: Record<string, any>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
}

const toStoreError = (err: unknown, fallback: string): StoreError => ({
  code: 'STORE_ERROR',
  message: err instanceof Error ? err.message : fallback,
});

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: [],
  logs: [],
  selectedAlert: null,
  filter: {},
  currentPage: 1,
  pageSize: 25,
  pagination: {
    page: 1,
    pageSize: 25,
    totalAlerts: 0,
  },
  loading: false,
  error: null,
  totalAlerts: 0,

  setAlerts: (alerts: Alert[]) => {
    set((state) => ({
      alerts,
      totalAlerts: alerts.length,
      pagination: {
        ...state.pagination,
        totalAlerts: alerts.length,
      },
    }));
  },

  setLogs: (logs: Alert[]) => {
    set({ logs });
  },

  setLoading: (loading: boolean) => set({ loading }),

  fetchAlerts: async (params) => {
    set({ loading: true, error: null });
    try {
      const page = params.page ?? get().currentPage;
      const pageSize = params.pageSize ?? get().pageSize;
      const listParams: ListParams = {
        ...params,
        page,
        pageSize,
      };
      const response = await APIClient.alerts.list(listParams);

      set({
        alerts: response.items,
        totalAlerts: response.total,
        currentPage: page,
        pageSize,
        pagination: {
          page,
          pageSize,
          totalAlerts: response.total,
        },
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: toStoreError(err, 'Failed to fetch alerts'),
      });
    }
  },

  selectAlert: async (alertId: string) => {
    set({ loading: true, error: null });
    try {
      const existing = [...get().alerts, ...get().logs].find((a) => a.id === alertId);
      if (existing) {
        set({ selectedAlert: existing, loading: false });
        return;
      }

      const alert = await APIClient.alerts.getById(alertId);
      set({ selectedAlert: alert, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: toStoreError(err, 'Failed to fetch alert details'),
      });
    }
  },

  updateAlert: async (alertId: string, updates: Partial<Alert>) => {
    try {
      const updated = await APIClient.alerts.update(alertId, updates);
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, ...updated } : alert
        ),
        selectedAlert:
          state.selectedAlert && state.selectedAlert.id === alertId
            ? { ...state.selectedAlert, ...updated }
            : state.selectedAlert,
      }));
    } catch (err) {
      set({ error: toStoreError(err, 'Failed to update alert') });
    }
  },

  addNotesToAlert: async (alertId: string, notes: string) => {
    try {
      return await APIClient.alerts.addNotes(alertId, notes);
    } catch (err) {
      set({ error: toStoreError(err, 'Failed to add note') });
      throw err;
    }
  },

  changeAlertStatus: async (alertId: string, newStatus: AlertStatus, notes: string) => {
    try {
      const updated = await APIClient.alerts.updateStatus(alertId, {
        status: newStatus,
        notes,
      });

      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, ...updated } : alert
        ),
        selectedAlert:
          state.selectedAlert && state.selectedAlert.id === alertId
            ? { ...state.selectedAlert, ...updated }
            : state.selectedAlert,
      }));
    } catch (err) {
      set({ error: toStoreError(err, 'Failed to change alert status') });
      throw err;
    }
  },

  queryAlerts: (filter: Record<string, any>) => {
    set({ filter, currentPage: 1 });
    void get().fetchAlerts({
      page: 1,
      pageSize: get().pageSize,
      ...filter,
    });
  },

  setPage: (page: number) => {
    set((state) => ({
      currentPage: page,
      pagination: {
        ...state.pagination,
        page,
      },
    }));
    void get().fetchAlerts({
      page,
      pageSize: get().pageSize,
      ...get().filter,
    });
  },

  setPageSize: (size: number) => {
    set((state) => ({
      pageSize: size,
      currentPage: 1,
      pagination: {
        ...state.pagination,
        page: 1,
        pageSize: size,
      },
    }));
    void get().fetchAlerts({
      page: 1,
      pageSize: size,
      ...get().filter,
    });
  },

  clearError: () => set({ error: null }),
}));

export const alertStore = useAlertStore;
