/**
 * Frontend API contract types used by dashboard pages/components.
 * These are intentionally shaped around runtime payloads.
 */

export type RiskLevel = 'COLD' | 'WARM' | 'HOT';

export type AlertStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'CONFIRMED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'ESCALATED'
  | 'RELEASED'
  | 'DELETED';

export type EmailClassification =
  | 'PHISHING'
  | 'SPAM'
  | 'MALWARE'
  | 'BUSINESS_EMAIL_COMPROMISE'
  | 'LEGITIMATE'
  | 'UNKNOWN';

export type ExportFormat = 'CSV' | 'PDF' | 'JSON';

export type UserRole = 'SOC_ANALYST' | 'SOC_ADMIN' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AlertMetadata {
  id: string;
  timestamp: string;
  sender: string;
  recipient: string[];
  subject: string;
  received?: string;
  bodyPreview?: string;
  classifications: string[];
}

export interface Alert {
  id: string;
  emailId?: string;
  timestamp: string;
  from: string;
  to: string;
  subject: string;
  bodyPreview?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: AlertStatus;
  classification: EmailClassification;
  classifications?: string[];
  urls?: string[];
  attachments?: string[];
  metadata: AlertMetadata;
  riskBreakdown: {
    phishingScore: number;
    malwareScore: number;
    urlReputation: number;
    senderReputation: number;
    contentSuspicion: number;
    overallRisk: number;
  };
  auditHistory?: AuditEntry[];
}

export type Log = Alert;

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  userEmail: string;
  action: string;
  alertId?: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalAlerts: number;
  newAlerts: number;
  hotAlerts: number;
  warmAlerts: number;
  coldAlerts: number;
  quarantinedEmails: number;
  alertsByRisk: Record<RiskLevel, number>;
  alertsByStatus: Record<string, number>;
  topSenders: Array<{ email: string; count: number }>;
  topDetectedThreats: Array<{ type: string; count: number }>;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  riskLevels?: RiskLevel[];
  statuses?: AlertStatus[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}
