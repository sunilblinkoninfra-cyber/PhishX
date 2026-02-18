import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Widget } from '@/types/widgets';

interface WidgetStore {
  // State
  widgets: Widget[];
  editMode: boolean;
  lastRefreshTime: number;

  // Widget Management
  addWidget: (widget: Widget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widget: Widget) => void;
  setWidgets: (widgets: Widget[]) => void;

  // Layout Management
  reorderWidgets: (widgets: Widget[]) => void;
  saveLayout: () => void;
  loadLayout: () => void;

  // Edit Mode
  setEditMode: (editMode: boolean) => void;

  // Refresh Management
  refreshWidget: (widgetId: string) => void;
  refreshAllWidgets: () => void;
  getLastRefreshTime: () => number;
}

const defaultWidgets: Widget[] = [
  {
    id: 'widget-1',
    type: 'risk-distribution',
    title: 'Risk Distribution',
    size: 'medium',
    position: { row: 0, col: 0 },
    refreshInterval: 300000,
    customization: {},
    isActive: true,
    lastRefreshed: new Date().toISOString(),
  },
  {
    id: 'widget-2',
    type: 'risk-timeline',
    title: 'Risk Timeline',
    size: 'large',
    position: { row: 0, col: 2 },
    refreshInterval: 300000,
    customization: {},
    isActive: true,
    lastRefreshed: new Date().toISOString(),
  },
  {
    id: 'widget-3',
    type: 'top-senders',
    title: 'Top Suspicious Senders',
    size: 'medium',
    position: { row: 1, col: 0 },
    refreshInterval: 300000,
    customization: {},
    isActive: true,
    lastRefreshed: new Date().toISOString(),
  },
  {
    id: 'widget-4',
    type: 'threat-patterns',
    title: 'Threat Patterns',
    size: 'medium',
    position: { row: 1, col: 2 },
    refreshInterval: 300000,
    customization: {},
    isActive: true,
    lastRefreshed: new Date().toISOString(),
  },
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      // Initial State
      widgets: defaultWidgets,
      editMode: false,
      lastRefreshTime: Date.now(),

      // Add Widget
      addWidget: (widget: Widget) =>
        set((state) => ({
          widgets: [...state.widgets, widget],
        })),

      // Remove Widget
      removeWidget: (widgetId: string) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== widgetId),
        })),

      // Update Widget
      updateWidget: (widget: Widget) =>
        set((state) => ({
          widgets: state.widgets.map((w) => (w.id === widget.id ? widget : w)),
        })),

      // Set all widgets
      setWidgets: (widgets: Widget[]) =>
        set(() => ({
          widgets,
        })),

      // Reorder widgets
      reorderWidgets: (widgets: Widget[]) =>
        set(() => ({
          widgets: widgets.sort((a, b) => {
            if (a.position.row !== b.position.row) {
              return a.position.row - b.position.row;
            }
            return a.position.col - b.position.col;
          }),
        })),

      // Save layout to localStorage
      saveLayout: () => {
        const { widgets } = get();
        localStorage.setItem('widget-layout', JSON.stringify(widgets));
      },

      // Load layout from localStorage
      loadLayout: () => {
        const stored = localStorage.getItem('widget-layout');
        if (stored) {
          try {
            const widgets = JSON.parse(stored);
            set(() => ({ widgets }));
          } catch (error) {
            console.error('Failed to load widget layout:', error);
          }
        }
      },

      // Set edit mode
      setEditMode: (editMode: boolean) =>
        set(() => ({
          editMode,
        })),

      // Refresh single widget
      refreshWidget: (widgetId: string) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId
              ? { ...w, lastRefreshed: new Date().toISOString() }
              : w
          ),
        })),

      // Refresh all widgets
      refreshAllWidgets: () =>
        set((state) => ({
          widgets: state.widgets.map((w) => ({
            ...w,
            lastRefreshed: new Date().toISOString(),
          })),
          lastRefreshTime: Date.now(),
        })),

      // Get last refresh time
      getLastRefreshTime: () => get().lastRefreshTime,
    }),
    {
      name: 'widget-store',
      partialState: {
        widgets: 'widgets',
      },
    }
  )
);
