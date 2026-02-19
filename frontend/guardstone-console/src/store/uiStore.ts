/**
 * UI store for page-level notifications and simple layout state.
 */

import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: ToastType;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

interface UIStoreState {
  isSidebarOpen: boolean;
  selectedTab: string;
  modalOpen: boolean;
  modalType: string | null;
  notifications: Notification[];

  toggleSidebar: () => void;
  setTab: (tab: string) => void;
  openModal: (type: string, data?: unknown) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'> & Partial<Pick<Notification, 'id' | 'timestamp'>>) => string;
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  isSidebarOpen: true,
  selectedTab: 'alerts',
  modalOpen: false,
  modalType: null,
  notifications: [],

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setTab: (tab: string) => set({ selectedTab: tab }),

  openModal: (type: string) => {
    set({
      modalOpen: true,
      modalType: type,
    });
  },

  closeModal: () => {
    set({
      modalOpen: false,
      modalType: null,
    });
  },

  addNotification: (notification) => {
    const id = notification.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newNotification: Notification = {
      id,
      type: notification.type,
      message: notification.message,
      timestamp: notification.timestamp || new Date(),
      autoClose: notification.autoClose ?? true,
      duration: notification.duration ?? 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (newNotification.autoClose !== false) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  addToast: (message: string, type: ToastType = 'info', duration = 4000) => {
    return get().addNotification({
      type,
      message,
      duration,
      autoClose: true,
    });
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

export const uiStore = useUIStore;
