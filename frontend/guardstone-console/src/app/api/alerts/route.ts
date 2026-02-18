/**
 * Alerts API Route
 * GET /api/alerts - Fetch alerts with filtering and pagination
 * POST /api/alerts - Create new alert
 */

import { NextRequest } from 'next/server';
import { Permission } from '@/types';
import {
  withPermission,
  successResponse,
  validationErrorResponse,
  getPaginationParams,
  createPaginatedResponse,
  validateRequestBody,
} from '@/lib/api-utils';
import { useAlertStore } from '@/stores';

// Handler for GET requests
async function getAlerts(request: NextRequest) {
  const { page, pageSize, skip } = getPaginationParams(request);

  // Get filter parameters from query string
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.getAll('status');
  const severity = searchParams.getAll('severity');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

  try {
    // In production, this would query the database
    // For now, we'll mock it with the store
    const store = useAlertStore();
    let alerts = Array.from(store.alerts.values());

    // Apply filters
    if (status.length > 0) {
      alerts = alerts.filter((a) => status.includes(a.status));
    }

    if (severity.length > 0) {
      alerts = alerts.filter((a) => {
        const riskScore = a.riskBreakdown.overallRisk;
        const severityMatch = severity.some((sev) => {
          if (sev === 'CRITICAL') return riskScore >= 80;
          if (sev === 'HIGH') return riskScore >= 60;
          if (sev === 'MEDIUM') return riskScore >= 40;
          return riskScore >= 0;
        });
        return severityMatch;
      });
    }

    // Apply sorting
    alerts.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });

    const total = alerts.length;
    const items = alerts.slice(skip, skip + pageSize);

    const paginatedResult = createPaginatedResponse(items, total, page, pageSize);

    return successResponse(paginatedResult);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return validationErrorResponse('Failed to fetch alerts');
  }
}

// Handler for POST requests
async function createAlert(request: NextRequest, user: any) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, [
      { field: 'title', type: 'string', required: true, minLength: 1, maxLength: 255 },
      { field: 'description', type: 'string', required: true, minLength: 1 },
      { field: 'severity', type: 'string', required: true },
      { field: 'source', type: 'string', required: true },
      { field: 'category', type: 'string', required: true },
    ]);

    if (!validation.valid) {
      return validationErrorResponse('Validation failed', validation.errors);
    }

    // Create alert
    const newAlert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      title: body.title,
      description: body.description,
      severity: body.severity,
      status: 'NEW',
      source: body.source,
      sourceId: body.sourceId,
      category: body.category,
      tags: body.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      riskLevel: 'WARM',
      riskBreakdown: {
        phishingScore: body.phishingScore || 50,
        malwareScore: body.malwareScore || 0,
        urlReputation: body.urlReputation || 0,
        senderReputation: body.senderReputation || 30,
        contentSuspicion: body.contentSuspicion || 20,
        overallRisk: body.overallRisk || 50,
      },
      auditHistory: [],
      iocList: [],
      modelExplanation: {
        model: 'PhishX-v3',
        version: '3.2.1',
        prediction: body.prediction || 'PHISHING',
        confidence: body.confidence || 0.85,
        topFeatures: [],
      },
      relatedAlerts: [],
      metadata: body.metadata || {},
    };

    // Store alert
    useAlertStore().addAlert(newAlert);

    // Audit log
    console.log(`Alert created by ${user.username}: ${newAlert.id}`);

    return successResponse(newAlert, 201);
  } catch (error) {
    console.error('Error creating alert:', error);
    return validationErrorResponse('Failed to create alert');
  }
}

// Export the API handler with permission checks
export const GET = withPermission(Permission.VIEW_ALERTS, async (request) => {
  return getAlerts(request);
});

export const POST = withPermission(Permission.CREATE_ALERT, async (request, user) => {
  return createAlert(request, user);
});
