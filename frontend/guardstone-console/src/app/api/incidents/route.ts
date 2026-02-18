/**
 * Incidents API Route
 * GET /api/incidents - Fetch incidents with filtering
 * POST /api/incidents - Create new incident
 */

import { NextRequest } from 'next/server';
import { Permission, Incident, IncidentStatus } from '@/types';
import {
  withPermission,
  successResponse,
  validationErrorResponse,
  getPaginationParams,
  createPaginatedResponse,
  validateRequestBody,
} from '@/lib/api-utils';
import { useIncidentStore } from '@/stores';

async function getIncidents(request: NextRequest) {
  const { page, pageSize, skip } = getPaginationParams(request);
  const searchParams = request.nextUrl.searchParams;

  const status = searchParams.getAll('status');
  const priority = searchParams.getAll('priority');
  const assignedTo = searchParams.get('assignedTo');

  try {
    const store = useIncidentStore();
    let incidents = Array.from(store.incidents.values());

    // Apply filters
    if (status.length > 0) {
      incidents = incidents.filter((i) => status.includes(i.status));
    }

    if (priority.length > 0) {
      incidents = incidents.filter((i) => priority.includes(i.priority));
    }

    if (assignedTo) {
      incidents = incidents.filter((i) => i.assignedTo === assignedTo);
    }

    // Sort by updated date (newest first)
    incidents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = incidents.length;
    const items = incidents.slice(skip, skip + pageSize);
    const result = createPaginatedResponse(items, total, page, pageSize);

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return validationErrorResponse('Failed to fetch incidents');
  }
}

async function createIncident(request: NextRequest, user: any) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, [
      { field: 'title', type: 'string', required: true, minLength: 1, maxLength: 255 },
      { field: 'description', type: 'string', required: true },
      { field: 'severity', type: 'string', required: true },
      { field: 'priority', type: 'string', required: true },
    ]);

    if (!validation.valid) {
      return validationErrorResponse('Validation failed', validation.errors);
    }

    // Create incident
    const newIncident: Incident = {
      id: `incident_${Date.now()}_${Math.random()}`,
      title: body.title,
      description: body.description,
      status: IncidentStatus.OPEN,
      priority: body.priority,
      severity: body.severity,
      createdAt: new Date(),
      updatedAt: new Date(),
      reporter: user.id,
      responders: [user.id],
      relatedAlerts: body.relatedAlerts || [],
      tags: body.tags || [],
      timeline: [
        {
          id: `entry_${Date.now()}`,
          timestamp: new Date(),
          action: 'Incident created',
          actor: user.username,
          details: `Incident created by ${user.username}`,
        },
      ],
      metadata: body.metadata || {},
    };

    // Store incident
    useIncidentStore().addIncident(newIncident);

    return successResponse(newIncident, 201);
  } catch (error) {
    console.error('Error creating incident:', error);
    return validationErrorResponse('Failed to create incident');
  }
}

export const GET = withPermission(Permission.VIEW_INCIDENTS, async (request) => {
  return getIncidents(request);
});

export const POST = withPermission(Permission.CREATE_INCIDENT, async (request, user) => {
  return createIncident(request, user);
});
