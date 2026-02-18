/**
 * Widget System Type Definitions
 * Defines all widget types and interfaces for the custom dashboard
 */

export type WidgetType =
  | 'top-senders'
  | 'risk-timeline'
  | 'threat-patterns'
  | 'anomaly-alerts'
  | 'risk-distribution'
  | 'response-time'
  | 'classification-breakdown'
  | 'user-activity'
  | 'ml-predictions'
  | 'compliance-status';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position?: {
    row: number;
    col: number;
  };
  refreshInterval?: number; // in seconds
  isActive: boolean;
  customization?: Record<string, unknown>;
  lastRefreshed?: Date;
}

export interface WidgetData<T> {
  id: string;
  data: T;
  loading: boolean;
  error?: string;
  lastFetched: Date;
}

// Widget-specific data types
export interface TopSendersData {
  senders: Array<{
    email: string;
    domain: string;
    count: number;
    riskScore: number;
  }>;
}

export interface RiskTimelineData {
  timeline: Array<{
    timestamp: Date;
    hotCount: number;
    warmCount: number;
    coldCount: number;
  }>;
}

export interface ThreatPatternData {
  patterns: Array<{
    id: string;
    description: string;
    occurrences: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    lastSeen: Date;
  }>;
}

export interface AnomalyAlertData {
  anomalies: Array<{
    id: string;
    type: string;
    description: string;
    confidence: number;
    affectedItems: number;
    timestamp: Date;
  }>;
}

export interface RiskDistributionData {
  distribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  trend: 'up' | 'down' | 'stable';
}

export interface ResponseTimeData {
  avgResponseTime: number; // in hours
  trend: number; // percentage change
  byStatus: Record<string, number>;
}

export interface ClassificationBreakdownData {
  classifications: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserActivityData {
  users: Array<{
    email: string;
    actionsCount: number;
    lastAction: Date;
    role: string;
  }>;
}

export interface MLPredictionData {
  predictions: Array<{
    metric: string;
    currentValue: number;
    predicted30d: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
}

export interface ComplianceStatusData {
  status: 'compliant' | 'at-risk' | 'non-compliant';
  metrics: Array<{
    name: string;
    value: number;
    target: number;
    status: 'pass' | 'warning' | 'fail';
  }>;
}

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  icon: string;
  category: 'analytics' | 'threats' | 'operations' | 'intelligence';
  refreshIntervalMin: number; // seconds
  refreshIntervalDefault: number; // seconds
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  'top-senders': {
    type: 'top-senders',
    title: 'Top Senders',
    description: 'Most active sender domains and risk analysis',
    defaultSize: 'medium',
    icon: '📧',
    category: 'intelligence',
    refreshIntervalMin: 300,
    refreshIntervalDefault: 600,
  },
  'risk-timeline': {
    type: 'risk-timeline',
    title: 'Risk Timeline',
    description: 'Historical risk trend over time',
    defaultSize: 'large',
    icon: '📈',
    category: 'analytics',
    refreshIntervalMin: 600,
    refreshIntervalDefault: 1800,
  },
  'threat-patterns': {
    type: 'threat-patterns',
    title: 'Threat Patterns',
    description: 'Detected threat patterns and trends',
    defaultSize: 'large',
    icon: '🎯',
    category: 'intelligence',
    refreshIntervalMin: 600,
    refreshIntervalDefault: 1800,
  },
  'anomaly-alerts': {
    type: 'anomaly-alerts',
    title: 'Anomaly Alerts',
    description: 'ML-detected anomalies and unusual activity',
    defaultSize: 'medium',
    icon: '⚡',
    category: 'threats',
    refreshIntervalMin: 300,
    refreshIntervalDefault: 600,
  },
  'risk-distribution': {
    type: 'risk-distribution',
    title: 'Risk Distribution',
    description: 'Current distribution of risk levels',
    defaultSize: 'small',
    icon: '🔴',
    category: 'analytics',
    refreshIntervalMin: 300,
    refreshIntervalDefault: 900,
  },
  'response-time': {
    type: 'response-time',
    title: 'Response Time',
    description: 'Average incident response metrics',
    defaultSize: 'small',
    icon: '⏱️',
    category: 'operations',
    refreshIntervalMin: 600,
    refreshIntervalDefault: 3600,
  },
  'classification-breakdown': {
    type: 'classification-breakdown',
    title: 'Classification Breakdown',
    description: 'Threats by classification type',
    defaultSize: 'medium',
    icon: '📊',
    category: 'analytics',
    refreshIntervalMin: 600,
    refreshIntervalDefault: 1800,
  },
  'user-activity': {
    type: 'user-activity',
    title: 'User Activity',
    description: 'SOC team activity and contributions',
    defaultSize: 'medium',
    icon: '👥',
    category: 'operations',
    refreshIntervalMin: 300,
    refreshIntervalDefault: 900,
  },
  'ml-predictions': {
    type: 'ml-predictions',
    title: 'ML Predictions',
    description: '30-day forecasts and predictions',
    defaultSize: 'large',
    icon: '🤖',
    category: 'intelligence',
    refreshIntervalMin: 1800,
    refreshIntervalDefault: 3600,
  },
  'compliance-status': {
    type: 'compliance-status',
    title: 'Compliance Status',
    description: 'Compliance and regulatory metrics',
    defaultSize: 'medium',
    icon: '✅',
    category: 'operations',
    refreshIntervalMin: 3600,
    refreshIntervalDefault: 7200,
  },
};
