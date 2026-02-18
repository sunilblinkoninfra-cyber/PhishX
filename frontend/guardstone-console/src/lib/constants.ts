/**
 * Application Constants
 */

// Risk Levels
export const RISK_LEVELS = {
  COLD: 'COLD',
  WARM: 'WARM',
  HOT: 'HOT',
} as const;

// Alert Statuses
export const ALERT_STATUSES = {
  NEW: 'NEW',
  INVESTIGATING: 'INVESTIGATING',
  CONFIRMED: 'CONFIRMED',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  RESOLVED: 'RESOLVED',
} as const;

// User Roles
export const USER_ROLES = {
  SOC_ANALYST: 'SOC_ANALYST',
  SOC_ADMIN: 'SOC_ADMIN',
  AUDITOR: 'AUDITOR',
} as const;

// IOC Types
export const IOC_TYPES = {
  URL: 'URL',
  IP: 'IP',
  DOMAIN: 'DOMAIN',
  EMAIL: 'EMAIL',
  FILE_HASH: 'FILE_HASH',
  SENDER_EMAIL: 'SENDER_EMAIL',
} as const;

// Audit Actions
export const AUDIT_ACTIONS = {
  VIEWED: 'VIEWED',
  INVESTIGATED: 'INVESTIGATED',
  RELEASED: 'RELEASED',
  DELETED: 'DELETED',
  EXPORTED: 'EXPORTED',
  NOTED: 'NOTED',
} as const;

// Export Formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  PDF: 'pdf',
  JSON: 'json',
} as const;

// WebSocket Event Types
export const WEBSOCKET_EVENTS = {
  ALERT_CREATED: 'ALERT_CREATED',
  ALERT_UPDATED: 'ALERT_UPDATED',
  ALERT_STATUS_CHANGED: 'ALERT_STATUS_CHANGED',
  QUARANTINE_ACTION: 'QUARANTINE_ACTION',
  EXPORT_COMPLETED: 'EXPORT_COMPLETED',
  USER_ACTION: 'USER_ACTION',
  SYSTEM_EVENT: 'SYSTEM_EVENT',
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED',
} as const;

// Risk Score Thresholds
export const RISK_THRESHOLDS = {
  COLD_MAX: 3.0,
  WARM_MAX: 7.0,
  HOT_MIN: 7.0,
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 500,
  MIN_PAGE_SIZE: 10,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  ALERTS: '/alerts',
  LOGS: '/logs',
  QUARANTINE: '/quarantine',
  AUDIT: '/audit',
  METRICS: '/metrics',
  EXPORTS: '/exports',
  USERS: '/users',
  HEALTH: '/health',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  INTERNAL_SERVER_ERROR: 'An error occurred. Please try again later.',
  TIMEOUT: 'Request timeout. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ALERT_UPDATED: 'Alert updated successfully.',
  STATUS_CHANGED: 'Status changed successfully.',
  NOTES_ADDED: 'Investigation notes added.',
  EXPORTED: 'Export started. You will receive a notification when ready.',
  QUARANTINE_RELEASED: 'Email released from quarantine.',
  QUARANTINE_DELETED: 'Email permanently deleted from quarantine.',
} as const;

// Local Storage Keys
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'phishx_auth_token',
  AUTH_TOKEN_EXPIRY: 'phishx_token_expiry',
  USER_PREFERENCES: 'phishx_user_preferences',
  SIDEBAR_STATE: 'phishx_sidebar_state',
  SELECTED_TAB: 'phishx_selected_tab',
} as const;

// Date/Time Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ssZ',
  DISPLAY: 'MMM DD, YYYY HH:mm',
  TIME_ONLY: 'HH:mm:ss',
  DATE_ONLY: 'MMM DD, YYYY',
} as const;

// Feature Limits
export const LIMITS = {
  MAX_BULK_ACTIONS: 100,
  MAX_EXPORT_ALERTS: 10000,
  MAX_NOTES_LENGTH: 5000,
  MAX_SEARCH_QUERY_LENGTH: 200,
  SESSION_TIMEOUT_MINUTES: 30,
  SOCKET_RECONNECT_MAX_ATTEMPTS: 5,
} as const;

// Sort Options
export const SORT_OPTIONS = {
  TIMESTAMP_DESC: 'timestamp_desc',
  TIMESTAMP_ASC: 'timestamp_asc',
  RISK_DESC: 'risk_desc',
  RISK_ASC: 'risk_asc',
  STATUS: 'status',
} as const;
