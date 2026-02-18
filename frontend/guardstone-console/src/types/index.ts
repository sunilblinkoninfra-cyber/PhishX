/**
 * Core Type Definitions for Guardstone Console SOC System
 * Enterprise-grade security operations command console
 */

// ==================================================
// AUTHENTICATION & RBAC
// ==================================================

export enum UserRole {
  ADMIN = 'admin',
  SOC_MANAGER = 'soc_manager',
  SOC_ANALYST = 'soc_analyst',
  AUDITOR = 'auditor',
  API = 'api',
  VIEWER = 'viewer',
}

export enum Permission {
  // Alert Management
  VIEW_ALERTS = 'view_alerts',
  CREATE_ALERT = 'create_alert',
  UPDATE_ALERT = 'update_alert',
  DELETE_ALERT = 'delete_alert',
  ACKNOWLEDGE_ALERT = 'acknowledge_alert',
  ESCALATE_ALERT = 'escalate_alert',

  // Incident Management
  VIEW_INCIDENTS = 'view_incidents',
  CREATE_INCIDENT = 'create_incident',
  UPDATE_INCIDENT = 'update_incident',
  CLOSE_INCIDENT = 'close_incident',
  ASSIGN_INCIDENT = 'assign_incident',

  // Investigation
  VIEW_INVESTIGATION = 'view_investigation',
  START_INVESTIGATION = 'start_investigation',
  COMMENT_INVESTIGATION = 'comment_investigation',

  // Quarantine
  VIEW_QUARANTINE = 'view_quarantine',
  RESTORE_MESSAGE = 'restore_message',
  DELETE_MESSAGE = 'delete_message',

  // Audit
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_AUDIT = 'export_audit',

  // Configuration
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_POLICIES = 'manage_policies',
  MANAGE_TEMPLATES = 'manage_templates',

  // System
  SYSTEM_SETTINGS = 'system_settings',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',
}

export type RolePermissionMap = {
  [key in UserRole]: Permission[];
};

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  teamId?: string;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken?: string | null;
  expiresAt: Date | null;
  permissions: Permission[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  token: AuthToken;
  expiresAt: Date;
}

// ==================================================
// RISK MAPPING & ALERT TYPES
// ==================================================

export type RiskLevel = 'COLD' | 'WARM' | 'HOT';

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  CONFIRMED = 'confirmed',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  QUARANTINED = 'quarantined',
  ESCALATED = 'escalated',
}

export interface RiskBreakdown {
  phishingScore: number;
  malwareScore: number;
  urlReputation: number;
  senderReputation: number;
  contentSuspicion: number;
  overallRisk: number;
}

export interface IOC {
  type: 'URL' | 'IP' | 'DOMAIN' | 'EMAIL' | 'FILE_HASH' | 'SENDER_EMAIL';
  value: string;
  reputation?: 'UNKNOWN' | 'SUSPICIOUS' | 'MALICIOUS';
  detectionCount?: number;
  firstSeen?: Date;
  lastSeen?: Date;
}

export interface AlertMetadata {
  id: string;
  timestamp: Date;
  sender: string;
  recipient: string[];
  subject: string;
  messageId: string;
  inReplyTo?: string;
  received: Date;
  contentType: string;
  hasAttachments: boolean;
  attachmentCount: number;
  bodyPreview: string;
  classifications: string[];
}

export interface ModelExplanation {
  model: string;
  version: string;
  prediction: 'PHISHING' | 'LEGITIMATE' | 'SUSPICIOUS';
  confidence: number;
  topFeatures: Array<{
    feature: string;
    importance: number;
    direction: 'positive' | 'negative';
  }>;
  shapValues?: Record<string, number>;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: 'VIEWED' | 'INVESTIGATED' | 'RELEASED' | 'DELETED' | 'EXPORTED' | 'NOTED';
  alertId: string;
  notes?: string;
  previousStatus?: AlertStatus;
  newStatus?: AlertStatus;
  details?: Record<string, any>;
}

export interface Alert {
  // Metadata
  metadata: AlertMetadata;
  
  // Risk Assessment
  riskLevel: RiskLevel;
  riskBreakdown: RiskBreakdown;
  status: AlertStatus;
  
  // Investigation Data
  iocList: IOC[];
  modelExplanation: ModelExplanation;
  
  // Audit Trail
  auditHistory: AuditEntry[];
  
  // Quarantine Info (if applicable)
  quarantineLocation?: string;
  quarantineReason?: string;
  originalLocation?: string;
  releaseWorkflow?: {
    requiredApprovals: number;
    currentApprovals: number;
    approvedBy: string[];
    releaseDate?: Date;
  };
  
  // Investigation Context
  relatedAlerts?: string[]; // Alert IDs
  investigationNotes?: string;
  investigatedBy?: string;
}

// ==================================================
// PAGINATION & FILTERING
// ==================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AlertFilter {
  riskLevel?: RiskLevel[];
  status?: AlertStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sender?: string;
  recipient?: string;
  hasAttachments?: boolean;
  searchQuery?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================================================
// API RESPONSE TYPES
// ==================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

// ==================================================
// EXPORT TYPES
// ==================================================

export type ExportFormat = 'CSV' | 'PDF' | 'JSON';

export interface ExportRequest {
  alertIds: string[];
  format: ExportFormat;
  includeAuditHistory: boolean;
  includeIOCs: boolean;
  includeModelExplanation: boolean;
  fileName: string;
}

export interface ExportResponse {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ==================================================
// REALTIME UPDATES
// ==================================================

export type WebSocketEventType =
  | 'ALERT_CREATED'
  | 'ALERT_UPDATED'
  | 'ALERT_STATUS_CHANGED'
  | 'QUARANTINE_ACTION'
  | 'EXPORT_COMPLETED'
  | 'USER_ACTION'
  | 'SYSTEM_EVENT';

export interface WebSocketEvent {
  type: WebSocketEventType;
  timestamp: Date;
  userId?: string;
  payload: any;
  alertId?: string;
}

// ==================================================
// STORE STATE TYPES
// ==================================================

export interface AlertStoreState {
  alerts: Map<string, Alert>;
  selectedAlert: Alert | null;
  filter: AlertFilter;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: ErrorResponse | null;
  totalAlerts: number;
  
  // Actions
  fetchAlerts: (params: PaginationParams & AlertFilter) => Promise<void>;
  selectAlert: (alertId: string) => Promise<void>;
  updateAlert: (alertId: string, updates: Partial<Alert>) => Promise<void>;
  addNotesToAlert: (alertId: string, notes: string) => Promise<AuditEntry>;
  changeAlertStatus: (alertId: string, newStatus: AlertStatus, notes: string) => Promise<void>;
  queryAlerts: (filter: AlertFilter) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
}

export interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface UIStoreState {
  isSidebarOpen: boolean;
  selectedTab: string;
  modalOpen: boolean;
  modalType: string | null;
  notifications: Notification[];
  
  // Actions
  toggleSidebar: () => void;
  setTab: (tab: string) => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

// ==================================================
// DASHBOARD & METRICS
// ==================================================

export interface DashboardMetrics {
  totalAlerts: number;
  newAlerts: number;
  hotAlerts: number;
  warmAlerts: number;
  coldAlerts: number;
  quarantinedEmails: number;
  alertsByRisk: Record<RiskLevel, number>;
  alertsByStatus: Record<AlertStatus, number>;
  topSenders: Array<{ email: string; count: number }>;
  topDetectedThreats: Array<{ type: string; count: number }>;
}

// ==================================================
// AUDIT & COMPLIANCE
// ==================================================

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export interface ComplianceReport {
  period: string;
  totalAlerts: number;
  analyzedAlerts: number;
  falsePositives: number;
  confirmedThreats: number;
  averageAnalysisTime: number;
  analysisAccuracy: number;
}

// ==================================================
// WORKFLOW & AUTOMATION
// ==================================================

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum WorkflowTriggerType {
  ALERT = 'alert',
  EVENT = 'event',
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
}

export enum WorkflowActionType {
  NOTIFICATION = 'notification',
  ESCALATE = 'escalate',
  AUTO_RESPOND = 'auto_respond',
  ASSIGN = 'assign',
  CREATE_TICKET = 'create_ticket',
  UPDATE_STATUS = 'update_status',
  ADD_TAG = 'add_tag',
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  SLACK = 'slack',
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  enabled: boolean;
  priority: number;
  executionCount: number;
  lastExecutedAt?: Date;
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  conditions: Record<string, any>;
  schedule?: string;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: Record<string, any>;
  order: number;
  enabled: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: any;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  triggeredAt: Date;
  completedAt?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  results: WorkflowExecutionResult[];
  error?: string;
  durationMs?: number;
}

export interface WorkflowExecutionResult {
  actionId: string;
  actionType: WorkflowActionType;
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  executedAt: Date;
}

// ==================================================
// INCIDENT & INVESTIGATION
// ==================================================

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REOPENED = 'reopened',
}

export enum IncidentPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  severity: AlertSeverity;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  assignedTo?: string;
  reporter: string;
  responders: string[];
  relatedAlerts: string[];
  tags: string[];
  timeline: TimelineEntry[];
  metadata: Record<string, any>;
  customFields?: Record<string, any>;
}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
  change?: { field: string; from: any; to: any };
}

export interface Investigation {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  analyst: string;
  startedAt: Date;
  completedAt?: Date;
  findings: InvestigationFinding[];
  notes: InvestigationNote[];
  artifacts: Artifact[];
}

export interface InvestigationFinding {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  sources: string[];
  evidence: IOC[];
}

export interface InvestigationNote {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  attachments?: string[];
}

export interface Artifact {
  id: string;
  type: string;
  value: string;
  description?: string;
  confidence: number;
  sources: string[];
}

// ==================================================
// QUARANTINE MANAGEMENT
// ==================================================

export enum QuarantineMessageStatus {
  QUARANTINED = 'quarantined',
  REVIEWED = 'reviewed',
  RESTORED = 'restored',
  DELETED = 'deleted',
  RELEASED = 'released',
}

export interface QuarantinedMessage {
  id: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  receivedAt: Date;
  quarantinedAt: Date;
  status: QuarantineMessageStatus;
  reason: string;
  riskScore: number;
  detections: Detection[];
  actions: QuarantineAction[];
}

export interface Detection {
  engineName: string;
  detectionType: string;
  confidence: number;
  details: string;
}

export interface QuarantineAction {
  id: string;
  action: QuarantineMessageStatus;
  performedBy: string;
  performedAt: Date;
  reason?: string;
}

// ==================================================
// REALTIME METRICS & DASHBOARD
// ==================================================

export interface RealtimeMetrics {
  alertsPerMinute: number;
  averageResolutionTime: number;
  activeIncidents: number;
  quarantinedCount: number;
  topSources: Array<{ source: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  updateTimestamp: Date;
}

export interface DashboardWidget {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  name: string;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

// ==================================================
// TEMPLATE MANAGEMENT
// ==================================================

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  category: string;
  tags: string[];
  createdAt: Date;
}

export interface ResponseTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  tags: string[];
  createdAt: Date;
}

// ==================================================
// ENHANCED WEBSOCKET TYPES
// ==================================================

export type WebSocketMessageType =
  | 'alert:new'
  | 'alert:updated'
  | 'alert:status_changed'
  | 'incident:created'
  | 'incident:updated'
  | 'incident:closed'
  | 'event:received'
  | 'workflow:executed'
  | 'workflow:failed'
  | 'message:broadcast'
  | 'metrics:update'
  | 'auth:required'
  | 'health:check'
  | 'user:action';

export interface WebSocketMessage {
  id: string;
  type: WebSocketMessageType;
  timestamp: Date;
  payload: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface WebSocketConnectionOptions {
  url: string;
  token: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// ==================================================
// AUDIT & COMPLIANCE ENHANCED
// ==================================================

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  APPROVE = 'approve',
  REJECT = 'reject',
  ESCALATE = 'escalate',
  ACKNOWLEDGE = 'acknowledge',
  ASSIGN = 'assign',
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  changes?: Record<string, { from: any; to: any }>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

