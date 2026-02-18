/**
 * Authentication API Route
 * POST /api/auth/login - User login
 * POST /api/auth/logout - User logout
 * POST /api/auth/refresh - Refresh access token
 * GET /api/auth/me - Get current user info
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  authenticateRequest,
  validateRequestBody,
  withErrorHandling,
} from '@/lib/api-utils';
import { User, UserRole, AuthToken } from '@/types';
import { createMockAuthToken } from '@/stores';

async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = validateRequestBody(body, [
      { field: 'email', type: 'string', required: true },
      { field: 'password', type: 'string', required: true, minLength: 6 },
    ]);

    if (!validation.valid) {
      return validationErrorResponse('Validation failed', validation.errors);
    }

    // Mock authentication - in production, validate against database
    const mockUser: User = {
      id: 'user_123',
      email: body.email,
      username: body.email.split('@')[0],
      firstName: 'Security',
      lastName: 'Analyst',
      name: 'Security Analyst',
      role: UserRole.SOC_ANALYST,
      permissions: [],
      department: 'Security',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token: AuthToken = createMockAuthToken(24);

    return successResponse(
      {
        user: mockUser,
        token,
        expiresAt: new Date(Date.now() + token.expiresIn * 1000),
      },
      200
    );
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('AUTH_ERROR', 'Authentication failed', 401);
  }
}

async function handleLogout(request: NextRequest) {
  try {
    // In production, would invalidate the token
    return successResponse({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('LOGOUT_ERROR', 'Logout failed', 500);
  }
}

async function handleRefreshToken(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.refreshToken) {
      return errorResponse('INVALID_TOKEN', 'Refresh token is required', 400);
    }

    // In production, would validate the refresh token
    const newToken: AuthToken = createMockAuthToken(24);

    return successResponse({
      token: newToken,
      expiresAt: new Date(Date.now() + newToken.expiresIn * 1000),
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse('TOKEN_ERROR', 'Token refresh failed', 401);
  }
}

async function handleGetCurrentUser(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    return successResponse(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('USER_ERROR', 'Failed to get current user', 500);
  }
}

// Export handlers
export const POST = withErrorHandling(async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('/login')) {
    return handleLogin(request);
  } else if (pathname.includes('/logout')) {
    return handleLogout(request);
  } else if (pathname.includes('/refresh')) {
    return handleRefreshToken(request);
  }

  return errorResponse('INVALID_ENDPOINT', 'Invalid endpoint', 404);
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('/me')) {
    return handleGetCurrentUser(request);
  }

  return errorResponse('INVALID_ENDPOINT', 'Invalid endpoint', 404);
});
