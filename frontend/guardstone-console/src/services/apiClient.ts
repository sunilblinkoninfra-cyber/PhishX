/**
 * API Client Service
 * Typed fetch wrapper for backend API integration
 */

import {
  Alert,
  AlertFilter,
  AlertStatus,
  ApiResponse,
  DashboardMetrics,
  ErrorResponse,
  PaginationParams,
  User,
} from '@/types';

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class APIClient {
  private static readonly BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Generic fetch method with timeout and error handling
   */
  private static async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { timeout = this.DEFAULT_TIMEOUT, ...fetchOptions } = options;

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    // Set default content type
    if (!fetchOptions.headers?.['Content-Type']) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new APIError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error
        );
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new APIError(
          data.message || 'API request failed',
          500,
          data
        );
      }

      return data.data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof APIError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  }

  /**
   * Get stored authentication token
   */
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /**
   * Authentication endpoints
   */
  static auth = {
    login: (email: string, password: string) =>
      APIClient.fetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    logout: () =>
      APIClient.fetch<void>('/auth/logout', {
        method: 'POST',
      }),

    refreshToken: () =>
      APIClient.fetch<{ token: string }>('/auth/refresh', {
        method: 'POST',
      }),

    me: () =>
      APIClient.fetch<User>('/auth/me'),

    validateToken: () =>
      APIClient.fetch<{ valid: boolean }>('/auth/validate'),
  };

  /**
   * Alert endpoints
   */
  static alerts = {
    list: (filter: AlertFilter, pagination: PaginationParams) =>
      APIClient.fetch<{ alerts: Alert[]; total: number; page: number; pageSize: number }>(
        `/alerts?page=${pagination.page}&pageSize=${pagination.pageSize}`,
        {
          method: 'POST',
          body: JSON.stringify(filter),
        }
      ),

    get: (alertId: string) =>
      APIClient.fetch<Alert>(`/alerts/${alertId}`),

    update: (alertId: string, updates: Partial<Alert>) =>
      APIClient.fetch<Alert>(`/alerts/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),

    changeStatus: (alertId: string, status: AlertStatus, notes?: string) =>
      APIClient.fetch<Alert>(`/alerts/${alertId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      }),

    addNotes: (alertId: string, notes: string) =>
      APIClient.fetch<Alert>(`/alerts/${alertId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),

    delete: (alertId: string) =>
      APIClient.fetch<void>(`/alerts/${alertId}`, {
        method: 'DELETE',
      }),

    bulkDelete: (alertIds: string[]) =>
      APIClient.fetch<{ deleted: number }>('/alerts/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({ alertIds }),
      }),

    export: (alertIds: string[], format: 'csv' | 'pdf' | 'json') =>
      APIClient.fetch<{ jobId: string; estimatedTime: number }>(
        '/alerts/export',
        {
          method: 'POST',
          body: JSON.stringify({ alertIds, format }),
        }
      ),
  };

  /**
   * Logs endpoints
   */
  static logs = {
    list: (filter: AlertFilter, pagination: PaginationParams) =>
      APIClient.fetch<{ logs: Alert[]; total: number }>(
        `/logs?page=${pagination.page}&pageSize=${pagination.pageSize}`,
        {
          method: 'POST',
          body: JSON.stringify(filter),
        }
      ),

    get: (logId: string) =>
      APIClient.fetch<Alert>(`/logs/${logId}`),
  };

  /**
   * Quarantine endpoints
   */
  static quarantine = {
    list: (pagination: PaginationParams) =>
      APIClient.fetch<{ alerts: Alert[]; total: number }>(
        `/quarantine?page=${pagination.page}&pageSize=${pagination.pageSize}`
      ),

    get: (alertId: string) =>
      APIClient.fetch<Alert>(`/quarantine/${alertId}`),

    release: (alertId: string, notes: string) =>
      APIClient.fetch<Alert>(`/quarantine/${alertId}/release`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),

    delete: (alertId: string, notes: string) =>
      APIClient.fetch<void>(`/quarantine/${alertId}`, {
        method: 'DELETE',
        body: JSON.stringify({ notes }),
      }),
  };

  /**
   * Audit endpoints
   */
  static audit = {
    list: (pagination: PaginationParams, filters?: Record<string, any>) =>
      APIClient.fetch<{ auditEntries: any[]; total: number }>(
        `/audit?page=${pagination.page}&pageSize=${pagination.pageSize}`,
        {
          method: 'POST',
          body: JSON.stringify(filters || {}),
        }
      ),

    getAlertHistory: (alertId: string) =>
      APIClient.fetch<any[]>(`/audit/alerts/${alertId}`),

    getUserHistory: (userEmail: string) =>
      APIClient.fetch<any[]>(`/audit/users/${userEmail}`),
  };

  /**
   * Metrics endpoints
   */
  static metrics = {
    dashboard: () =>
      APIClient.fetch<DashboardMetrics>('/metrics/dashboard'),

    compliance: () =>
      APIClient.fetch<any>('/metrics/compliance'),

    riskTrends: (days: number) =>
      APIClient.fetch<any>(`/metrics/risk-trends?days=${days}`),
  };

  /**
   * Export job endpoints
   */
  static exports = {
    submit: (alertIds: string[], format: 'csv' | 'pdf' | 'json', options?: any) =>
      APIClient.fetch<{ jobId: string; estimatedTime: number }>(
        '/exports',
        {
          method: 'POST',
          body: JSON.stringify({ alertIds, format, options }),
        }
      ),

    status: (jobId: string) =>
      APIClient.fetch<{ status: string; progress: number; downloadUrl?: string }>(
        `/exports/${jobId}`
      ),

    download: (jobId: string) =>
      fetch(`${APIClient.BASE_URL}/exports/${jobId}/download`, {
        headers: {
          'Authorization': `Bearer ${APIClient.getToken()}`,
        },
      }),

    cancel: (jobId: string) =>
      APIClient.fetch<void>(`/exports/${jobId}`, {
        method: 'DELETE',
      }),
  };

  /**
   * User management endpoints
   */
  static users = {
    list: (pagination: PaginationParams) =>
      APIClient.fetch<{ users: User[]; total: number }>(
        `/users?page=${pagination.page}&pageSize=${pagination.pageSize}`
      ),

    get: (userEmail: string) =>
      APIClient.fetch<User>(`/users/${userEmail}`),

    update: (userEmail: string, updates: Partial<User>) =>
      APIClient.fetch<User>(`/users/${userEmail}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),

    create: (user: Partial<User> & { email: string; password: string }) =>
      APIClient.fetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      }),

    delete: (userEmail: string) =>
      APIClient.fetch<void>(`/users/${userEmail}`, {
        method: 'DELETE',
      }),

    resetPassword: (userEmail: string) =>
      APIClient.fetch<void>(`/users/${userEmail}/reset-password`, {
        method: 'POST',
      }),
  };

  /**
   * Health check
   */
  static health = {
    check: () =>
      APIClient.fetch<{ status: string; uptime: number }>('/health'),
  };
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}
