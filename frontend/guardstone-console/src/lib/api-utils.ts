/**
 * API Route Handler Utilities & Guards
 * Shared utilities for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { User, Permission, ApiResponse, ErrorResponse } from '@/types';
import { checkPermissions } from '@/middleware/rbac';
import { getConfig } from '@/lib/config';

// ===========================
// REQUEST AUTHENTICATION
// ===========================

export async function authenticateRequest(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Mock authentication - replace with actual JWT validation
    // In production, use: jwt.verify(token, JWT_SECRET)
    if (token === 'mock_token') {
      return {
        id: 'user_123',
        email: 'analyst@guardstone.com',
        username: 'analyst',
        name: 'Security Analyst',
        firstName: 'Security',
        lastName: 'Analyst',
        role: 'SOC_ANALYST',
        permissions: [],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// ===========================
// RESPONSE BUILDERS
// ===========================

export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date(),
      requestId: generateRequestId(),
    },
    { status: statusCode }
  );
}

export function errorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date(),
      requestId: generateRequestId(),
    },
    { status: statusCode }
  );
}

export function unauthorizedResponse(): NextResponse {
  return errorResponse('UNAUTHORIZED', 'User authentication required', 401);
}

export function forbiddenResponse(reason?: string): NextResponse {
  return errorResponse(
    'FORBIDDEN',
    reason || 'Insufficient permissions for this action',
    403
  );
}

export function validationErrorResponse(
  message: string,
  details?: unknown
): NextResponse {
  return errorResponse('VALIDATION_ERROR', message, 400, details);
}

export function notFoundResponse(resource: string): NextResponse {
  return errorResponse('NOT_FOUND', `${resource} not found`, 404);
}

export function internalErrorResponse(error?: unknown): NextResponse {
  console.error('Internal server error:', error);
  return errorResponse(
    'INTERNAL_ERROR',
    'An internal server error occurred',
    500
  );
}

// ===========================
// PERMISSION GUARDS
// ===========================

export async function requirePermission(
  request: NextRequest,
  requiredPermissions: Permission | Permission[]
): Promise<{ user: User; error?: NextResponse } | { user?: null; error: NextResponse }> {
  const user = await authenticateRequest(request);

  if (!user) {
    return { error: unauthorizedResponse() };
  }

  const permissionCheck = checkPermissions(user, requiredPermissions);
  if (!permissionCheck.allowed) {
    return { error: forbiddenResponse(permissionCheck.reason) };
  }

  return { user };
}

// ===========================
// REQUEST VALIDATION
// ===========================

export interface ValidationRule {
  field: string;
  type: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: any) => boolean;
}

export function validateRequestBody(
  body: any,
  rules: ValidationRule[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = body[rule.field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[rule.field] = `${rule.field} is required`;
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (typeof value !== rule.type) {
      errors[rule.field] = `${rule.field} must be of type ${rule.type}`;
      continue;
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors[rule.field] = `${rule.field} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors[rule.field] = `${rule.field} must be at most ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[rule.field] = `${rule.field} format is invalid`;
    }

    // Custom validation
    if (rule.validate && !rule.validate(value)) {
      errors[rule.field] = `${rule.field} validation failed`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ===========================
// RATE LIMITING
// ===========================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 900000 // 15 minutes
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

export function logApiCall(
  method: string,
  path: string,
  statusCode: number,
  userId?: string,
  duration?: number
): void {
  const config = getConfig();
  if (config.logging.level === 'debug') {
    const message = `[${method}] ${path} - ${statusCode}${
      duration ? ` (${duration}ms)` : ''
    }${userId ? ` - User: ${userId}` : ''}`;
    console.log(message);
  }
}

// ===========================
// HANDLER WRAPPER
// ===========================

export type ApiHandler = (
  request: NextRequest
) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    try {
      const startTime = Date.now();
      const response = await handler(request);
      const duration = Date.now() - startTime;

      logApiCall(
        request.method,
        request.nextUrl.pathname,
        response.status,
        undefined,
        duration
      );

      return response;
    } catch (error) {
      console.error('API handler error:', error);
      return internalErrorResponse(error);
    }
  };
}

export function withPermission(
  requiredPermissions: Permission | Permission[],
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
): ApiHandler {
  return withErrorHandling(async (request: NextRequest) => {
    const { user, error } = await requirePermission(request, requiredPermissions);

    if (error) {
      return error;
    }

    if (!user) {
      return unauthorizedResponse();
    }

    return handler(request, user);
  });
}

// ===========================
// RESPONSE PAGINATION
// ===========================

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

export function getPaginationParams(
  request: NextRequest,
  options: PaginationOptions = {}
): { page: number; pageSize: number; skip: number } {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(
    Math.max(1, parseInt(searchParams.get('pageSize') || '25')),
    options.maxPageSize || 100
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
