/**
 * Custom Hooks
 * React hooks for component integration with store and services
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { alertStore } from '@/store/alertStore';
import { authStore } from '@/store/authStore';
import { uiStore } from '@/store/uiStore';
import { APIClient, APIError } from '@/services/apiClient';
import { websocketService } from '@/services/websocketService';
import { checkPermission } from '@/middleware/rbac';
import type {
  Alert,
  AlertFilter,
  AlertStatus,
  User,
  PaginationParams,
  WebSocketEvent,
} from '@/types';

/**
 * Hook to fetch and manage a single alert
 */
export function useAlert(alertId: string) {
  const selectedAlert = alertStore((state) => state.selectedAlert);
  const loading = alertStore((state) => state.loading);
  const error = alertStore((state) => state.error);
  const selectAlert = alertStore((state) => state.selectAlert);
  const updateAlert = alertStore((state) => state.updateAlert);
  const changeStatus = alertStore((state) => state.changeAlertStatus);
  const addNotes = alertStore((state) => state.addNotesToAlert);

  useEffect(() => {
    selectAlert(alertId);
  }, [alertId, selectAlert]);

  // Subscribe to real-time updates for this alert
  useEffect(() => {
    if (!selectedAlert) return;

    const unsubscribe = websocketService.subscribeToAlert(
      alertId,
      (event: WebSocketEvent) => {
        if (event.type === 'ALERT_UPDATED') {
          updateAlert(alertId, event.payload);
        }
      }
    );

    return unsubscribe;
  }, [alertId, selectedAlert, updateAlert]);

  return {
    alert: selectedAlert,
    loading,
    error,
    changeStatus,
    addNotes,
    updateAlert,
  };
}

/**
 * Hook to manage list of alerts with pagination and filtering
 */
export function useAlerts(initialFilter?: AlertFilter) {
  const alerts = alertStore((state) => state.alerts);
  const pagination = alertStore((state) => ({
    page: state.pagination.page,
    pageSize: state.pagination.pageSize,
    totalAlerts: state.pagination.totalAlerts,
  }));
  const loading = alertStore((state) => state.loading);
  const error = alertStore((state) => state.error);
  const fetchAlerts = alertStore((state) => state.fetchAlerts);
  const queryAlerts = alertStore((state) => state.queryAlerts);
  const setPage = alertStore((state) => state.setPage);
  const setPageSize = alertStore((state) => state.setPageSize);

  useEffect(() => {
    if (initialFilter) {
      queryAlerts(initialFilter);
    } else {
      fetchAlerts({ page: 0, pageSize: 50 });
    }
  }, [initialFilter]);

  return {
    alerts: Array.from(alerts.values()),
    pagination,
    loading,
    error,
    fetchAlerts,
    queryAlerts,
    setPage,
    setPageSize,
  };
}

/**
 * Hook for authentication management
 */
export function useAuth() {
  const user = authStore((state) => state.user);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const loading = authStore((state) => state.loading);
  const error = authStore((state) => state.error);
  const login = authStore((state) => state.login);
  const logout = authStore((state) => state.logout);
  const checkAuth = authStore((state) => state.checkAuth);
  const refreshToken = authStore((state) => state.refreshToken);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    checkAuth,
    refreshToken,
  };
}

/**
 * Hook for RBAC permission checking
 */
export function useRBAC(user?: User) {
  const currentUser = user || authStore((state) => state.user);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!currentUser) return false;
      return checkPermission(currentUser, permission);
    },
    [currentUser]
  );

  const canInvestigate = useCallback(() => {
    if (!currentUser) return false;
    return checkPermission(currentUser, 'investigate:alerts');
  }, [currentUser]);

  const canRelease = useCallback(() => {
    if (!currentUser) return false;
    return checkPermission(currentUser, 'release:quarantine');
  }, [currentUser]);

  const canDelete = useCallback(() => {
    if (!currentUser) return false;
    return checkPermission(currentUser, 'delete:alerts');
  }, [currentUser]);

  const canExport = useCallback(() => {
    if (!currentUser) return false;
    return checkPermission(currentUser, 'export:data');
  }, [currentUser]);

  const canManageUsers = useCallback(() => {
    if (!currentUser) return false;
    return checkPermission(currentUser, 'manage:users');
  }, [currentUser]);

  return {
    hasPermission,
    canInvestigate,
    canRelease,
    canDelete,
    canExport,
    canManageUsers,
  };
}

/**
 * Hook for WebSocket connection and event subscription
 */
export function useWebSocket(eventType?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = authStore((state) => state.user);
  const token = authStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    websocketService.connect(token).catch((err) => {
      setError(err instanceof Error ? err.message : 'Connection failed');
    });

    setIsConnected(websocketService.isConnected());

    if (eventType) {
      const unsubscribe = websocketService.on(eventType, (event) => {
        // Event handler will be provided by consumer
      });

      return () => {
        unsubscribe();
      };
    }
  }, [token, eventType]);

  return {
    isConnected,
    error,
    send: (type: string, payload: any) =>
      websocketService.send(type, payload),
    subscribe: websocketService.on.bind(websocketService),
    subscribeOnce: websocketService.once.bind(websocketService),
  };
}

/**
 * Hook for UI state management
 */
export function useUI() {
  const isSidebarOpen = uiStore((state) => state.isSidebarOpen);
  const selectedTab = uiStore((state) => state.selectedTab);
  const modalOpen = uiStore((state) => state.modalOpen);
  const modalType = uiStore((state) => state.modalType);
  const notifications = uiStore((state) => state.notifications);

  const toggleSidebar = uiStore((state) => state.toggleSidebar);
  const setTab = uiStore((state) => state.setTab);
  const openModal = uiStore((state) => state.openModal);
  const closeModal = uiStore((state) => state.closeModal);
  const addNotification = uiStore((state) => state.addNotification);
  const removeNotification = uiStore((state) => state.removeNotification);

  return {
    isSidebarOpen,
    selectedTab,
    modalOpen,
    modalType,
    notifications,
    toggleSidebar,
    setTab,
    openModal,
    closeModal,
    addNotification,
    removeNotification,
  };
}

/**
 * Hook for async data fetching with loading and error states
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>
): {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  retry: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const apiError =
        err instanceof APIError
          ? err
          : new APIError(
              err instanceof Error ? err.message : 'Unknown error',
              500
            );
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, retry: execute };
}

/**
 * Hook for form state management
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T
): {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleBlur: (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;
} {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [initialValues_, setInitialValues] = useState(initialValues);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues_);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const setFieldValue = (field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setFieldError = (field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const resetForm = () => {
    setValues(initialValues_);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setErrors,
    resetForm,
  };
}

/**
 * Hook for notification management with auto-dismiss
 */
export function useNotification() {
  const addNotification = uiStore((state) => state.addNotification);
  const removeNotification = uiStore((state) => state.removeNotification);

  const showSuccess = useCallback(
    (message: string, duration: number = 3000) => {
      const id = crypto.randomUUID();
      addNotification({
        id,
        message,
        type: 'success',
        timestamp: new Date(),
      });
      setTimeout(() => removeNotification(id), duration);
    },
    [addNotification, removeNotification]
  );

  const showError = useCallback(
    (message: string, duration: number = 5000) => {
      const id = crypto.randomUUID();
      addNotification({
        id,
        message,
        type: 'error',
        timestamp: new Date(),
      });
      setTimeout(() => removeNotification(id), duration);
    },
    [addNotification, removeNotification]
  );

  const showInfo = useCallback(
    (message: string, duration: number = 3000) => {
      const id = crypto.randomUUID();
      addNotification({
        id,
        message,
        type: 'info',
        timestamp: new Date(),
      });
      setTimeout(() => removeNotification(id), duration);
    },
    [addNotification, removeNotification]
  );

  const showWarning = useCallback(
    (message: string, duration: number = 4000) => {
      const id = crypto.randomUUID();
      addNotification({
        id,
        message,
        type: 'warning',
        timestamp: new Date(),
      });
      setTimeout(() => removeNotification(id), duration);
    },
    [addNotification, removeNotification]
  );

  return { showSuccess, showError, showInfo, showWarning };
}
