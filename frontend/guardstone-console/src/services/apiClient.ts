/**
 * API Client Service
 * Contract bridge between frontend pages and backend endpoints.
 */

import {
  Alert,
  AlertStatus,
  AuditEntry,
  DashboardMetrics,
  ListParams,
  ListResponse,
  User,
} from '@/types/api';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  timeout?: number;
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export class APIClient {
  private static readonly BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  private static readonly DEFAULT_TIMEOUT = 30000;

  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token_id');
  }

  private static getTenantId(): string {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('tenantId') ||
        process.env.NEXT_PUBLIC_TENANT_ID ||
        DEFAULT_TENANT_ID
      );
    }
    return process.env.NEXT_PUBLIC_TENANT_ID || DEFAULT_TENANT_ID;
  }

  private static buildHeaders(options: FetchOptions): HeadersInit {
    const existing = (options.headers || {}) as Record<string, string>;
    const headers: Record<string, string> = { ...existing };

    const token = this.getToken();
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (!headers.Authorization) {
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }
    }

    if (!headers['X-Tenant-ID']) {
      headers['X-Tenant-ID'] = this.getTenantId();
    }

    const hasBody = options.body !== undefined && options.body !== null;
    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type'
    );

    if (hasBody && !hasContentType && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private static normalizeBody(options: FetchOptions): BodyInit | undefined {
    if (options.body === undefined || options.body === null) {
      return undefined;
    }
    if (
      typeof options.body === 'string' ||
      options.body instanceof FormData ||
      options.body instanceof URLSearchParams ||
      options.body instanceof Blob
    ) {
      return options.body;
    }
    return JSON.stringify(options.body);
  }

  private static async fetchRaw<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { timeout = this.DEFAULT_TIMEOUT, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: this.buildHeaders(fetchOptions),
        body: this.normalizeBody(fetchOptions),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let payload: any = null;
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        payload = text;
      }

      if (!response.ok) {
        const message =
          payload?.message || payload?.detail || payload?.error || `HTTP ${response.status}`;
        throw new APIError(message, response.status, payload);
      }

      if (payload && typeof payload === 'object') {
        if (payload.success === false) {
          throw new APIError(payload.message || 'API request failed', 500, payload);
        }
        if (payload.data !== undefined && payload.success !== undefined) {
          return payload.data as T;
        }
      }

      return payload as T;
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

  private static buildListQuery(params: ListParams = {}): string {
    const query = new URLSearchParams();
    const limit = params.limit ?? params.pageSize ?? 100;
    const offset =
      params.offset ??
      ((params.page && params.page > 0 ? params.page - 1 : 0) * (params.pageSize ?? limit));

    query.set('limit', String(limit));
    query.set('offset', String(offset));

    if (params.riskLevels?.length) {
      query.set('riskLevels', params.riskLevels.join(','));
    }

    if (params.statuses?.length) {
      query.set('status', params.statuses.join(','));
    }

    return query.toString();
  }

  static auth = {
    login: async (email: string, password: string) => {
      const payload = await APIClient.fetchRaw<any>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const tokenData = payload?.data || payload || {};
      const accessToken = tokenData.access_token || tokenData.token || '';
      const refreshToken = tokenData.refresh_token_id || tokenData.refreshToken || '';

      if (typeof window !== 'undefined') {
        if (accessToken) localStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token_id', refreshToken);
      }

      const user: User = payload?.user || {
        id: email,
        email,
        name: email.split('@')[0],
        role: 'SOC_ANALYST',
      };

      return {
        token: accessToken,
        refreshToken,
        user,
      };
    },

    logout: async () => {
      try {
        await APIClient.fetchRaw('/auth/logout', { method: 'POST' });
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token_id');
        }
      }
    },

    refreshToken: async () => {
      const refreshTokenId = APIClient.getRefreshToken();
      if (!refreshTokenId) {
        throw new APIError('No refresh token available', 401);
      }

      const payload = await APIClient.fetchRaw<any>('/auth/refresh', {
        method: 'POST',
        body: { refresh_token_id: refreshTokenId },
      });

      const token = payload?.access_token || payload?.token || '';
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('token', token);
      }
      return { token };
    },

    me: async () => {
      const payload = await APIClient.fetchRaw<any>('/auth/me');
      const user: User = {
        id: payload.id || payload.email || 'current-user',
        email: payload.email || 'user@phishx.local',
        name: payload.name || payload.email || 'Security User',
        role: payload.role || 'SOC_ANALYST',
      };
      return user;
    },

    validateToken: async () => {
      const payload = await APIClient.fetchRaw<any>('/auth/validate');
      return { valid: Boolean(payload?.valid) };
    },
  };

  static alerts = {
    list: async (params: ListParams = {}): Promise<ListResponse<Alert>> => {
      const query = APIClient.buildListQuery(params);
      return APIClient.fetchRaw<ListResponse<Alert>>(`/alerts?${query}`);
    },

    get: (alertId: string) => APIClient.fetchRaw<Alert>(`/alerts/${alertId}`),

    getById: (alertId: string) => APIClient.fetchRaw<Alert>(`/alerts/${alertId}`),

    update: async (alertId: string, updates: Partial<Alert>) => {
      if (updates.status) {
        return APIClient.fetchRaw<Alert>(`/alerts/${alertId}/status`, {
          method: 'POST',
          body: updates,
        });
      }
      return APIClient.fetchRaw<Alert>(`/alerts/${alertId}/status`, {
        method: 'POST',
        body: updates,
      });
    },

    updateStatus: (alertId: string, payload: { status: AlertStatus; notes?: string; changedBy?: string }) =>
      APIClient.fetchRaw<Alert>(`/alerts/${alertId}/status`, {
        method: 'POST',
        body: payload,
      }),

    changeStatus: (alertId: string, status: AlertStatus, notes?: string) =>
      APIClient.fetchRaw<Alert>(`/alerts/${alertId}/status`, {
        method: 'POST',
        body: { status, notes },
      }),

    addNote: (
      alertId: string,
      payload: { text?: string; notes?: string; addedBy?: string; added_by?: string }
    ) =>
      APIClient.fetchRaw<any>(`/alerts/${alertId}/notes`, {
        method: 'POST',
        body: payload,
      }),

    addNotes: (alertId: string, notes: string) =>
      APIClient.fetchRaw<any>(`/alerts/${alertId}/notes`, {
        method: 'POST',
        body: { notes },
      }),

    release: (alertId: string, payload?: Record<string, unknown>) =>
      APIClient.fetchRaw<Alert>(`/alerts/${alertId}/release`, {
        method: 'POST',
        body: payload || {},
      }),

    delete: (alertId: string, payload?: Record<string, unknown>) =>
      APIClient.fetchRaw<{ status: string; id: string }>(`/alerts/${alertId}`, {
        method: 'DELETE',
        body: payload || {},
      }),

    bulkDelete: async (alertIds: string[]) => {
      let deleted = 0;
      for (const alertId of alertIds) {
        await APIClient.alerts.delete(alertId);
        deleted += 1;
      }
      return { deleted };
    },

    export: (alertIds: string[], format: 'csv' | 'pdf' | 'json') =>
      APIClient.fetchRaw<{ jobId: string; status: string }>('/exports', {
        method: 'POST',
        body: { alertIds, format: format.toUpperCase() },
      }),
  };

  static logs = {
    list: async (params: ListParams = {}): Promise<ListResponse<Alert>> => {
      const query = APIClient.buildListQuery(params);
      return APIClient.fetchRaw<ListResponse<Alert>>(`/logs?${query}`);
    },

    get: (logId: string) => APIClient.fetchRaw<Alert>(`/alerts/${logId}`),
  };

  static quarantine = {
    list: (params: ListParams = {}) =>
      APIClient.alerts.list({ ...params, riskLevels: ['HOT'] }),

    get: (alertId: string) => APIClient.alerts.get(alertId),

    release: (alertId: string, notes?: string) =>
      APIClient.alerts.release(alertId, { notes }),

    delete: (alertId: string, notes?: string) =>
      APIClient.alerts.delete(alertId, { notes }),
  };

  static audit = {
    list: async (params: ListParams = {}): Promise<ListResponse<AuditEntry>> => {
      const query = APIClient.buildListQuery(params);
      return APIClient.fetchRaw<ListResponse<AuditEntry>>(`/audit?${query}`);
    },

    getAlertHistory: async (alertId: string) => {
      const result = await APIClient.audit.list({ limit: 500, offset: 0 });
      return result.items.filter((entry) => entry.alertId === alertId);
    },

    getUserHistory: async (userEmail: string) => {
      const result = await APIClient.audit.list({ limit: 500, offset: 0 });
      return result.items.filter((entry) => entry.userEmail === userEmail);
    },
  };

  static metrics = {
    dashboard: () => APIClient.fetchRaw<DashboardMetrics>('/metrics/dashboard'),

    compliance: () => APIClient.fetchRaw<Record<string, unknown>>('/metrics/summary'),

    riskTrends: () => APIClient.fetchRaw<Record<string, unknown>>('/metrics/summary'),
  };

  static exports = {
    create: (payload: Record<string, unknown>) =>
      APIClient.fetchRaw<{ jobId: string; status: string }>('/exports', {
        method: 'POST',
        body: payload,
      }),

    submit: (alertIds: string[], format: 'csv' | 'pdf' | 'json', options?: any) =>
      APIClient.fetchRaw<{ jobId: string; status: string }>('/exports', {
        method: 'POST',
        body: { alertIds, format: format.toUpperCase(), options },
      }),

    status: (jobId: string) => Promise.resolve({ status: 'QUEUED', progress: 0, jobId }),

    download: (_jobId: string) => {
      throw new APIError('Export download endpoint is not implemented', 501);
    },

    cancel: (_jobId: string) => Promise.resolve(),
  };

  static users = {
    list: (_params: { page?: number; pageSize?: number }) =>
      Promise.resolve({ users: [] as User[], total: 0 }),

    get: (_userId: string) => APIClient.auth.me(),

    update: (userId: string, updates: Partial<User>) =>
      APIClient.fetchRaw<User>(`/users/${userId || 'current-user'}`, {
        method: 'PATCH',
        body: updates,
      }),

    create: (_user: Partial<User> & { email: string; password: string }) => {
      throw new APIError('User creation endpoint is not implemented', 501);
    },

    delete: (_userId: string) => {
      throw new APIError('User deletion endpoint is not implemented', 501);
    },

    resetPassword: (_userId: string) => {
      throw new APIError('Password reset endpoint is not implemented', 501);
    },
  };

  static health = {
    check: () => APIClient.fetchRaw<{ status: string; version?: string; components?: any }>('/health'),
  };
}

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
