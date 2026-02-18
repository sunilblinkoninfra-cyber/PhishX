/**
 * Protected Route Component
 * Enforces RBAC access control for routes and components
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Permission, UserRole } from '@/types';
import { useAuthStore } from '@/stores';
import { hasPermission, hasRole, hasRoleHierarchy } from '@/middleware/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission | Permission[];
  requiredRoles?: UserRole[];
  requiredMinimumRole?: UserRole;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermissions,
  requiredRoles,
  requiredMinimumRole,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated || !user) {
      router.push('/login');
      setIsLoading(false);
      return;
    }

    // Check permissions
    if (requiredPermissions) {
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      const hasPerms = permissions.every((perm) => hasPermission(user, perm));
      if (!hasPerms) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }
    }

    // Check roles
    if (requiredRoles && !hasRole(user, requiredRoles)) {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    // Check role hierarchy
    if (requiredMinimumRole && !hasRoleHierarchy(user, requiredMinimumRole)) {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [user, isAuthenticated, requiredPermissions, requiredRoles, requiredMinimumRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You do not have permission to access this resource.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Export hook for permission checks
export function useHasPermission(permission: Permission | Permission[]): boolean {
  const { user } = useAuthStore();
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.every((perm) => hasPermission(user, perm));
}

// Export hook for role checks
export function useHasRole(roles: UserRole[]): boolean {
  const { user } = useAuthStore();
  return hasRole(user, roles);
}

// Export hook for role hierarchy checks
export function useHasMinimumRole(role: UserRole): boolean {
  const { user } = useAuthStore();
  return hasRoleHierarchy(user, role);
}
