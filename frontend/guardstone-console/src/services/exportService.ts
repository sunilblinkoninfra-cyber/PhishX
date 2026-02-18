/**
 * Export Service
 * Handles CSV and PDF export of alerts and audit data
 */

import { Alert, ExportFormat, ExportRequest, ExportResponse } from '@/types';

export class ExportService {
  /**
   * Export alerts to CSV format
   */
  static async exportToCSV(
    alerts: Alert[],
    includeAuditHistory: boolean = false,
    includeIOCs: boolean = true
  ): Promise<Blob> {
    const headers = [
      'Alert ID',
      'Timestamp',
      'Sender',
      'Recipients',
      'Subject',
      'Risk Level',
      'Risk Score',
      'Status',
      'Has Attachments',
      'Classifications',
    ];

    if (includeIOCs) {
      headers.push('IOCs');
    }

    if (includeAuditHistory) {
      headers.push('Investigation Notes', 'Last Action', 'Last Action By', 'Last Action Time');
    }

    const rows = alerts.map((alert) => {
      const row = [
        alert.metadata.id,
        alert.metadata.timestamp.toISOString(),
        alert.metadata.sender,
        alert.metadata.recipient.join(';'),
        alert.metadata.subject,
        alert.riskLevel,
        alert.riskBreakdown.overallRisk.toFixed(2),
        alert.status,
        alert.metadata.hasAttachments ? 'Yes' : 'No',
        alert.metadata.classifications.join(';'),
      ];

      if (includeIOCs) {
        const iocs = alert.iocList
          .map((ioc) => `${ioc.type}:${ioc.value}`)
          .join(';');
        row.push(iocs);
      }

      if (includeAuditHistory && alert.auditHistory.length > 0) {
        const lastEntry = alert.auditHistory[alert.auditHistory.length - 1];
        row.push(
          alert.investigationNotes || '',
          lastEntry.action,
          lastEntry.userEmail,
          lastEntry.timestamp.toISOString()
        );
      }

      return row;
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export alerts to PDF format (requires external library)
   * For now, returns a text-based PDF-like format
   */
  static async exportToPDF(
    alerts: Alert[],
    includeAuditHistory: boolean = false,
    includeIOCs: boolean = true
  ): Promise<Blob> {
    // In production, use a library like pdfkit or jspdf
    let pdfContent = `GUARDSTONE CONSOLE - ALERT EXPORT
Generated: ${new Date().toISOString()}
Total Alerts: ${alerts.length}

${'='.repeat(80)}

`;

    alerts.forEach((alert, index) => {
      pdfContent += `
ALERT #${index + 1}
${'-'.repeat(40)}
ID: ${alert.metadata.id}
Timestamp: ${alert.metadata.timestamp.toISOString()}
From: ${alert.metadata.sender}
To: ${alert.metadata.recipient.join(', ')}
Subject: ${alert.metadata.subject}

Risk Assessment:
  Level: ${alert.riskLevel}
  Overall Risk: ${alert.riskBreakdown.overallRisk.toFixed(2)}/10
  Phishing Score: ${alert.riskBreakdown.phishingScore.toFixed(2)}
  Malware Score: ${alert.riskBreakdown.malwareScore.toFixed(2)}
  URL Reputation: ${alert.riskBreakdown.urlReputation.toFixed(2)}

Status: ${alert.status}
Has Attachments: ${alert.metadata.hasAttachments}
Classifications: ${alert.metadata.classifications.join(', ')}

`;

      if (includeIOCs && alert.iocList.length > 0) {
        pdfContent += `Indicators of Compromise:
`;
        alert.iocList.forEach((ioc) => {
          pdfContent += `  - ${ioc.type}: ${ioc.value}${ioc.reputation ? ` (${ioc.reputation})` : ''}
`;
        });
        pdfContent += '\n';
      }

      if (includeAuditHistory && alert.auditHistory.length > 0) {
        pdfContent += `Investigation History:
`;
        alert.auditHistory.forEach((entry) => {
          pdfContent += `  [${entry.timestamp.toISOString()}] ${entry.userEmail} - ${entry.action}`;
          if (entry.notes) {
            pdfContent += ` (${entry.notes})`;
          }
          pdfContent += '\n';
        });
      }

      pdfContent += `\n${'='.repeat(80)}\n`;
    });

    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Export alerts to JSON format
   */
  static async exportToJSON(alerts: Alert[]): Promise<Blob> {
    const jsonContent = JSON.stringify(
      {
        exported: new Date().toISOString(),
        totalAlerts: alerts.length,
        alerts: alerts,
      },
      null,
      2
    );

    return new Blob([jsonContent], { type: 'application/json' });
  }

  /**
   * Submit export job to backend
   */
  static async submitExportJob(request: ExportRequest): Promise<ExportResponse> {
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Export job failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get export job status
   */
  static async getExportStatus(jobId: string): Promise<ExportResponse> {
    const response = await fetch(`/api/exports/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Download file
   */
  static downloadFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
