/**
 * Formatter Utilities
 * Functions for formatting dates, risk levels, status, and other data
 */

import { RiskLevel, AlertStatus, UserRole } from '@/types/api';

/**
 * Format a date to readable string (e.g., "Jan 15, 2024 2:30 PM")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date to time only (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return formatDate(d);
}

/**
 * Format risk score to percentage (e.g., "8.5/10 (85%)")
 */
export function formatRiskScore(score: number): string {
  const percentage = Math.round(score * 10);
  return `${score.toFixed(1)}/10 (${percentage}%)`;
}

/**
 * Get color class for risk level
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'COLD':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'WARM':
      return 'bg-yellow-100 text-yellow-900 border-yellow-300';
    case 'HOT':
      return 'bg-red-100 text-red-900 border-red-300';
    default:
      return 'bg-gray-100 text-gray-900 border-gray-300';
  }
}

/**
 * Get text color class for risk level
 */
export function getRiskLevelTextColor(level: RiskLevel): string {
  switch (level) {
    case 'COLD':
      return 'text-blue-600';
    case 'WARM':
      return 'text-yellow-600';
    case 'HOT':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get background color for risk level
 */
export function getRiskLevelBgColor(level: RiskLevel): string {
  switch (level) {
    case 'COLD':
      return 'bg-blue-50';
    case 'WARM':
      return 'bg-yellow-50';
    case 'HOT':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
}

/**
 * Get color class for alert status
 */
export function getStatusColor(status: AlertStatus): string {
  switch (status) {
    case 'NEW':
      return 'bg-gray-100 text-gray-900';
    case 'INVESTIGATING':
      return 'bg-blue-100 text-blue-900';
    case 'CONFIRMED':
      return 'bg-red-100 text-red-900';
    case 'FALSE_POSITIVE':
      return 'bg-green-100 text-green-900';
    case 'RESOLVED':
      return 'bg-gray-200 text-gray-900';
    default:
      return 'bg-gray-100 text-gray-900';
  }
}

/**
 * Get readable status label
 */
export function formatStatus(status: AlertStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get readable role label
 */
export function formatRole(role: UserRole): string {
  switch (role) {
    case 'SOC_ANALYST':
      return 'SOC Analyst';
    case 'SOC_ADMIN':
      return 'SOC Administrator';
    case 'AUDITOR':
      return 'Auditor';
    default:
      return 'Unknown';
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format email address for display (truncate if too long)
 */
export function formatEmail(email: string, maxLength: number = 30): string {
  if (email.length <= maxLength) return email;
  return email.substring(0, maxLength - 3) + '...';
}

/**
 * Format URL for display (remove protocol, truncate if too long)
 */
export function formatURL(url: string, maxLength: number = 50): string {
  let display = url.replace(/^https?:\/\//, '');
  if (display.length <= maxLength) return display;
  return display.substring(0, maxLength - 3) + '...';
}

/**
 * Format classification tags
 */
export function formatClassification(classification: string): string {
  return classification
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Get badge color based on IOC type
 */
export function getIOCTypeColor(type: string): string {
  switch (type) {
    case 'URL':
      return 'bg-blue-100 text-blue-800';
    case 'IP':
      return 'bg-purple-100 text-purple-800';
    case 'DOMAIN':
      return 'bg-green-100 text-green-800';
    case 'EMAIL':
      return 'bg-orange-100 text-orange-800';
    case 'FILE_HASH':
      return 'bg-red-100 text-red-800';
    case 'SENDER_EMAIL':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Highlight search term in text
 */
export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
