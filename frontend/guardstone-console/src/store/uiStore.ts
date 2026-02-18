/**
 * Zustand UI Store
 * Manages UI state (sidebar, modals, notifications, etc.)
 */

import { create } from 'zustand';
import { UIStoreState, Notification } from '@/types';

export const useUIStore = create<UIStoreState>((set, get) => ({
  isSidebarOpen: true,
  selectedTab: 'alerts',
  modalOpen: false,
  modalType: null,
  notifications: [],

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setTab: (tab: string) => set({ selectedTab: tab }),

  openModal: (type: string, data?: any) => {
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

  addNotification: (notification: Notification) => {
    const id = `notification-${Date.now()}`;
    const newNotification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration
    if (notification.autoClose !== false && notification.duration) {
      setTimeout(() => {
        get().removeNotification(id);
      }, notification.duration);
    }

    return id;
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

export const uiStore = useUIStore;
