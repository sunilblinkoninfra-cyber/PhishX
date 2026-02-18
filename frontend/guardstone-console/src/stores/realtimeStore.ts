/**
 * Real-time Metrics & Dashboard Store
 * Zustand store for managing real-time metrics, WebSocket updates, and dashboard state
 */

import { create } from 'zustand';
import { RealtimeMetrics, DashboardLayout, DashboardWidget } from '@/types';

interface RealtimeStoreState {
  // Metrics
  metrics: RealtimeMetrics | null;
  metricsUpdateFrequency: number; // milliseconds
  lastMetricsUpdate: Date | null;

  // Connection Status
  isConnected: boolean;
  connectedUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Dashboard
  layouts: Map<string, DashboardLayout>;
  currentLayout: DashboardLayout | null;
  customDashboard: DashboardWidget[];

  // Notifications & Events
  recentEvents: Array<{ id: string; type: string; timestamp: Date; message: string }>;
  maxRecentEvents: number;

  // Real-time Updates
  alertsInLast5Min: number;
  incidentsInLast24H: number;
  systemUptime: number; // in seconds

  // Actions - Metrics
  updateMetrics: (metrics: RealtimeMetrics) => void;
  setMetricsUpdateFrequency: (frequency: number) => void;

  // Actions - Connection
  setConnected: (connected: boolean) => void;
  setConnectedUsers: (count: number) => void;
  setSystemHealth: (health: 'healthy' | 'warning' | 'critical') => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  // Actions - Dashboard
  setLayouts: (layouts: DashboardLayout[]) => void;
  addLayout: (layout: DashboardLayout) => void;
  updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => void;
  deleteLayout: (layoutId: string) => void;
  selectLayout: (layout: DashboardLayout | null) => void;
  updateDashboardWidget: (widgetId: string, config: Record<string, any>) => void;
  addDashboardWidget: (widget: DashboardWidget) => void;
  removeDashboardWidget: (widgetId: string) => void;
  saveCustomDashboard: (widgets: DashboardWidget[]) => void;

  // Actions - Events
  addEvent: (type: string, message: string) => void;
  clearEvents: () => void;
  updateRealtimeCounters: (alerts: number, incidents: number) => void;

  // Utility
  getHealthStatus: () => {
    status: string;
    color: string;
    icon: string;
  };
  isSystemHealthy: () => boolean;
  reset: () => void;
}

const defaultMetrics: RealtimeMetrics = {
  alertsPerMinute: 0,
  averageResolutionTime: 0,
  activeIncidents: 0,
  quarantinedCount: 0,
  topSources: [],
  topCategories: [],
  updateTimestamp: new Date(),
};

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => ({
  // Initial State
  metrics: defaultMetrics,
  metricsUpdateFrequency: 5000, // 5 seconds
  lastMetricsUpdate: null,

  isConnected: false,
  connectedUsers: 0,
  systemHealth: 'healthy',
  connectionStatus: 'disconnected',

  layouts: new Map(),
  currentLayout: null,
  customDashboard: [],

  recentEvents: [],
  maxRecentEvents: 20,

  alertsInLast5Min: 0,
  incidentsInLast24H: 0,
  systemUptime: 0,

  // Metrics Actions
  updateMetrics: (metrics: RealtimeMetrics) => {
    set({
      metrics,
      lastMetricsUpdate: new Date(),
    });
  },

  setMetricsUpdateFrequency: (frequency: number) => {
    set({ metricsUpdateFrequency: Math.max(1000, frequency) });
  },

  // Connection Actions
  setConnected: (connected: boolean) => {
    set({
      isConnected: connected,
      connectionStatus: connected ? 'connected' : 'disconnected',
    });
  },

  setConnectedUsers: (count: number) => set({ connectedUsers: Math.max(0, count) }),

  setSystemHealth: (health: 'healthy' | 'warning' | 'critical') => {
    set({ systemHealth: health });
  },

  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    set({ connectionStatus: status });
    if (status === 'connected') {
      set({ isConnected: true });
    } else if (status === 'disconnected') {
      set({ isConnected: false });
    }
  },

  // Dashboard Actions
  setLayouts: (layouts: DashboardLayout[]) => {
    const layoutMap = new Map(layouts.map((layout) => [layout.id, layout]));
    set({ layouts: layoutMap });
  },

  addLayout: (layout: DashboardLayout) => {
    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.set(layout.id, layout);
      return { layouts: newLayouts };
    });
  },

  updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => {
    set((state) => {
      const layout = state.layouts.get(layoutId);
      if (!layout) return state;

      const updated = {
        ...layout,
        ...updates,
        updatedAt: new Date(),
      };

      const newLayouts = new Map(state.layouts);
      newLayouts.set(layoutId, updated);

      return {
        layouts: newLayouts,
        currentLayout: state.currentLayout?.id === layoutId ? updated : state.currentLayout,
      };
    });
  },

  deleteLayout: (layoutId: string) => {
    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.delete(layoutId);

      return {
        layouts: newLayouts,
        currentLayout: state.currentLayout?.id === layoutId ? null : state.currentLayout,
      };
    });
  },

  selectLayout: (layout: DashboardLayout | null) => {
    set({ currentLayout: layout });
  },

  updateDashboardWidget: (widgetId: string, config: Record<string, any>) => {
    set((state) => {
      const widgets = state.customDashboard.map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
      );

      return { customDashboard: widgets };
    });
  },

  addDashboardWidget: (widget: DashboardWidget) => {
    set((state) => ({
      customDashboard: [...state.customDashboard, widget],
    }));
  },

  removeDashboardWidget: (widgetId: string) => {
    set((state) => ({
      customDashboard: state.customDashboard.filter((w) => w.id !== widgetId),
    }));
  },

  saveCustomDashboard: (widgets: DashboardWidget[]) => {
    set({ customDashboard: widgets });
  },

  // Event Actions
  addEvent: (type: string, message: string) => {
    set((state) => {
      const newEvent = {
        id: `event_${Date.now()}_${Math.random()}`,
        type,
        timestamp: new Date(),
        message,
      };

      const events = [newEvent, ...state.recentEvents].slice(0, state.maxRecentEvents);

      return { recentEvents: events };
    });
  },

  clearEvents: () => set({ recentEvents: [] }),

  updateRealtimeCounters: (alerts: number, incidents: number) => {
    set({
      alertsInLast5Min: Math.max(0, alerts),
      incidentsInLast24H: Math.max(0, incidents),
    });
  },

  // Utility Actions
  getHealthStatus: () => {
    const { systemHealth } = get();

    const statusMap: Record<string, { status: string; color: string; icon: string }> = {
      healthy: {
        status: 'Healthy',
        color: 'green',
        icon: '✓',
      },
      warning: {
        status: 'Warning',
        color: 'yellow',
        icon: '⚠',
      },
      critical: {
        status: 'Critical',
        color: 'red',
        icon: '✕',
      },
    };

    return statusMap[systemHealth] || statusMap.healthy;
  },

  isSystemHealthy: (): boolean => {
    return get().systemHealth === 'healthy' && get().isConnected;
  },

  reset: () => {
    set({
      metrics: defaultMetrics,
      lastMetricsUpdate: null,
      isConnected: false,
      connectedUsers: 0,
      systemHealth: 'healthy',
      connectionStatus: 'disconnected',
      recentEvents: [],
      alertsInLast5Min: 0,
      incidentsInLast24H: 0,
      systemUptime: 0,
    });
  },
}));
