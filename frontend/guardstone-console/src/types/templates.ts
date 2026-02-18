/**
 * Template System Type Definitions
 * Defines templates for investigations, responses, and dashboards
 */

export type TemplateType =
  | 'investigation'
  | 'response'
  | 'dashboard'
  | 'report'
  | 'playbook';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  content: TemplateContent;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags: string[];
  version: number;
  usageCount: number;
}

export interface TemplateContent {
  sections: TemplateSection[];
  metadata?: Record<string, unknown>;
  instructions?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  type: 'checklist' | 'notes' | 'data' | 'questions' | 'steps';
  content: TemplateSectionContent[];
  required: boolean;
  order: number;
}

export interface TemplateSectionContent {
  id: string;
  label: string;
  type: 'checkbox' | 'text' | 'textarea' | 'select' | 'boolean' | 'date' | 'number';
  placeholder?: string;
  options?: string[];
  required: boolean;
  defaultValue?: unknown;
}

// Investigation Template
export interface InvestigationTemplate extends Template {
  type: 'investigation';
}

// Response Template (Playbook)
export interface ResponseTemplate extends Template {
  type: 'response';
  triggers: string[];
  actions: ResponseAction[];
}

export interface ResponseAction {
  id: string;
  name: string;
  description: string;
  action: 'quarantine' | 'release' | 'notify' | 'custom';
  conditions?: ResponseCondition[];
  priority: number;
}

export interface ResponseCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'matches';
  value: unknown;
}

// Dashboard Template
export interface DashboardTemplate extends Template {
  type: 'dashboard';
  layout: DashboardLayout;
}

export interface DashboardLayout {
  cols: number;
  rowHeight: number;
  widgets: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

// Report Template
export interface ReportTemplate extends Template {
  type: 'report';
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'narrative' | 'recommendations';
  dataSource?: string;
  content?: string;
}

// Playbook (specialized Response Template)
export interface Playbook extends ResponseTemplate {
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedResolutionTime: number; // in minutes
  steps: PlaybookStep[];
  rollback?: RollbackPlan;
}

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  action: string;
  assignedRole: string;
  estimatedTime: number; // in minutes
  autoExecute: boolean;
  rollbackStep?: PlaybookStep;
}

export interface RollbackPlan {
  id: string;
  description: string;
  steps: PlaybookStep[];
  estimatedTime: number; // in minutes
}

// Template Categories
export const TEMPLATE_CATEGORIES: Record<TemplateType, string[]> = {
  investigation: [
    'phishing',
    'malware',
    'bec',
    'credential-theft',
    'data-exfiltration',
    'general',
  ],
  response: [
    'containment',
    'eradication',
    'recovery',
    'notification',
    'escalation',
  ],
  dashboard: [
    'executive',
    'analyst',
    'admin',
    'threats',
    'operations',
    'custom',
  ],
  report: [
    'daily',
    'weekly',
    'monthly',
    'incident',
    'compliance',
    'executive-summary',
  ],
  playbook: [
    'tier-1-response',
    'tier-2-response',
    'incident-management',
    'data-breach',
    'ransomware',
  ],
};

// PreBuilt Templates
export const PREBUILT_TEMPLATES: Partial<Template>[] = [
  {
    id: 'tmpl-phishing-investigation',
    name: 'Phishing Investigation Checklist',
    description: 'Standard investigation template for phishing alerts',
    type: 'investigation',
    category: 'phishing',
    isPublic: true,
    tags: ['phishing', 'email', 'investigation'],
  },
  {
    id: 'tmpl-bec-response',
    name: 'Business Email Compromise Response',
    description: 'Immediate response playbook for BEC incidents',
    type: 'response',
    category: 'escalation',
    isPublic: true,
    tags: ['bec', 'response', 'escalation'],
  },
  {
    id: 'tmpl-analyst-dashboard',
    name: 'SOC Analyst Dashboard',
    description: 'Optimized dashboard layout for analysts',
    type: 'dashboard',
    category: 'analyst',
    isPublic: true,
    tags: ['dashboard', 'analyst', 'operations'],
  },
  {
    id: 'tmpl-daily-report',
    name: 'Daily Security Report',
    description: 'Automated daily threat summary report',
    type: 'report',
    category: 'daily',
    isPublic: true,
    tags: ['report', 'daily', 'summary'],
  },
  {
    id: 'tmpl-ransomware-playbook',
    name: 'Ransomware Incident Playbook',
    description: 'Step-by-step ransomware response playbook',
    type: 'playbook',
    category: 'ransomware',
    isPublic: true,
    tags: ['ransomware', 'incident', 'playbook'],
  },
];
