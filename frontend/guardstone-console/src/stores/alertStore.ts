/**
 * Alert Management Store
 * Zustand store for managing security alerts and their lifecycle
 */

import { create } from 'zustand';
import {
  Alert,
  AlertStatus,
  AlertSeverity,
  AlertFilter,
  PaginatedResponse,
  ErrorResponse,
} from '@/types';

interface AlertStoreState {
  alerts: Map<string, Alert>;
  selectedAlert: Alert | null;
  filter: AlertFilter;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: ErrorResponse | null;
  totalAlerts: number;
  lastUpdated: Date | null;

  // Actions
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alertId: string, updates: Partial<Alert>) => void;
  removeAlert: (alertId: string) => void;
  selectAlert: (alert: Alert | null) => void;
  setFilter: (filter: AlertFilter) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: ErrorResponse | null) => void;
  setTotalAlerts: (total: number) => void;
  clearAlerts: () => void;
  changeAlertStatus: (alertId: string, status: AlertStatus) => void;
  acknowledgeAlert: (alertId: string, userId: string) => void;
  escalateAlert: (alertId: string, userId: string) => void;
  addNoteToAlert: (alertId: string, note: string) => void;
  getAlertsByStatus: (status: AlertStatus) => Alert[];
  getAlertsBySeverity: (severity: AlertSeverity) => Alert[];
}

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: new Map(),
  selectedAlert: null,
  filter: {},
  currentPage: 1,
  pageSize: 25,
  loading: false,
  error: null,
  totalAlerts: 0,
  lastUpdated: null,

  setAlerts: (alerts: Alert[]) => {
    const alertMap = new Map(alerts.map((alert) => [alert.id, alert]));
    set({ alerts: alertMap });
  },

  addAlert: (alert: Alert) => {
    set((state) => {
      const newAlerts = new Map(state.alerts);
      newAlerts.set(alert.id, alert);
      return { alerts: newAlerts, lastUpdated: new Date() };
    });
  },

  updateAlert: (alertId: string, updates: Partial<Alert>) => {
    set((state) => {
      const alert = state.alerts.get(alertId);
      if (!alert) return state;

      const updatedAlert = { ...alert, ...updates, updatedAt: new Date() };
      const newAlerts = new Map(state.alerts);
      newAlerts.set(alertId, updatedAlert);

      return {
        alerts: newAlerts,
        selectedAlert:
          state.selectedAlert?.id === alertId ? updatedAlert : state.selectedAlert,
        lastUpdated: new Date(),
      };
    });
  },

  removeAlert: (alertId: string) => {
    set((state) => {
      const newAlerts = new Map(state.alerts);
      newAlerts.delete(alertId);
      return {
        alerts: newAlerts,
        selectedAlert:
          state.selectedAlert?.id === alertId ? null : state.selectedAlert,
        lastUpdated: new Date(),
      };
    });
  },

  selectAlert: (alert: Alert | null) => set({ selectedAlert: alert }),

  setFilter: (filter: AlertFilter) => set({ filter, currentPage: 1 }),

  setPage: (page: number) => set({ currentPage: page }),

  setPageSize: (size: number) => set({ pageSize: size, currentPage: 1 }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: ErrorResponse | null) => {
    set({ error, loading: false });
    if (error) {
      console.error('Alert Store Error:', error);
    }
  },

  setTotalAlerts: (total: number) => set({ totalAlerts: total }),

  clearAlerts: () =>
    set({
      alerts: new Map(),
      selectedAlert: null,
      filter: {},
      currentPage: 1,
      error: null,
      totalAlerts: 0,
    }),

  changeAlertStatus: (alertId: string, status: AlertStatus) => {
    get().updateAlert(alertId, {
      status,
      updatedAt: new Date(),
    });
  },

  acknowledgeAlert: (alertId: string, userId: string) => {
    get().updateAlert(alertId, {
      status: AlertStatus.ACKNOWLEDGED,
      updatedAt: new Date(),
    });
  },

  escalateAlert: (alertId: string, userId: string) => {
    get().updateAlert(alertId, {
      status: AlertStatus.ESCALATED,
      updatedAt: new Date(),
    });
  },

  addNoteToAlert: (alertId: string, note: string) => {
    const alert = get().alerts.get(alertId);
    if (!alert) return;

    const updated = {
      ...alert,
      auditHistory: [
        ...(alert.auditHistory || []),
        {
          id: `note_${Date.now()}`,
          timestamp: new Date(),
          userId: 'current_user',
          userEmail: 'user@example.com',
          action: 'NOTED' as const,
          alertId,
          notes: note,
        },
      ],
    };
    get().updateAlert(alertId, updated);
  },

  getAlertsByStatus: (status: AlertStatus): Alert[] => {
    return Array.from(get().alerts.values()).filter((alert) => alert.status === status);
  },

  getAlertsBySeverity: (severity: AlertSeverity): Alert[] => {
    return Array.from(get().alerts.values()).filter(
      (alert) => alert.riskBreakdown.overallRisk >= (severity === 'CRITICAL' ? 90 : severity === 'HIGH' ? 70 : 50)
    );
  },
}));
