/**
 * RBAC (Role-Based Access Control) Middleware & Utilities
 * Middleware for enforcing permissions and access control
 */

import { User, UserRole, Permission, RolePermissionMap } from '@/types';

// ===========================
// PERMISSION MAPPING
// ===========================

export const ROLE_PERMISSION_MAP: RolePermissionMap = {
  [UserRole.ADMIN]: [
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERT,
    Permission.UPDATE_ALERT,
    Permission.DELETE_ALERT,
    Permission.ACKNOWLEDGE_ALERT,
    Permission.ESCALATE_ALERT,
    Permission.VIEW_INCIDENTS,
    Permission.CREATE_INCIDENT,
    Permission.UPDATE_INCIDENT,
    Permission.CLOSE_INCIDENT,
    Permission.ASSIGN_INCIDENT,
    Permission.VIEW_INVESTIGATION,
    Permission.START_INVESTIGATION,
    Permission.COMMENT_INVESTIGATION,
    Permission.VIEW_QUARANTINE,
    Permission.RESTORE_MESSAGE,
    Permission.DELETE_MESSAGE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_AUDIT,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_POLICIES,
    Permission.MANAGE_TEMPLATES,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
  ],
  [UserRole.SOC_MANAGER]: [
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERT,
    Permission.UPDATE_ALERT,
    Permission.ACKNOWLEDGE_ALERT,
    Permission.ESCALATE_ALERT,
    Permission.VIEW_INCIDENTS,
    Permission.CREATE_INCIDENT,
    Permission.UPDATE_INCIDENT,
    Permission.CLOSE_INCIDENT,
    Permission.ASSIGN_INCIDENT,
    Permission.VIEW_INVESTIGATION,
    Permission.START_INVESTIGATION,
    Permission.COMMENT_INVESTIGATION,
    Permission.VIEW_QUARANTINE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_AUDIT,
    Permission.MANAGE_POLICIES,
    Permission.MANAGE_TEMPLATES,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
  ],
  [UserRole.SOC_ANALYST]: [
    Permission.VIEW_ALERTS,
    Permission.UPDATE_ALERT,
    Permission.ACKNOWLEDGE_ALERT,
    Permission.VIEW_INCIDENTS,
    Permission.UPDATE_INCIDENT,
    Permission.ASSIGN_INCIDENT,
    Permission.VIEW_INVESTIGATION,
    Permission.START_INVESTIGATION,
    Permission.COMMENT_INVESTIGATION,
    Permission.VIEW_QUARANTINE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_DATA,
  ],
  [UserRole.AUDITOR]: [
    Permission.VIEW_ALERTS,
    Permission.VIEW_INCIDENTS,
    Permission.VIEW_INVESTIGATION,
    Permission.VIEW_QUARANTINE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_AUDIT,
  ],
  [UserRole.API]: [
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERT,
    Permission.VIEW_INCIDENTS,
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_ALERTS,
    Permission.VIEW_INCIDENTS,
    Permission.VIEW_QUARANTINE,
    Permission.VIEW_AUDIT_LOGS,
  ],
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSION_MAP[role] || [];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.id) return false;
  const permissions = getPermissionsForRole(user.role);
  return permissions.includes(permission);
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(
  user: User | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: User | null,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if user can perform an action on a resource
 */
export function canAccess(
  user: User | null,
  requiredPermission: Permission
): boolean {
  return hasPermission(user, requiredPermission);
}

export function checkPermission(
  user: User | null,
  permission: string
): boolean {
  return hasPermission(user, permission as Permission);
}

/**
 * Check if user's role is in the allowed roles
 */
export function hasRole(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Check if user's role is higher than or equal to minimum role
 */
export function hasRoleHierarchy(
  user: User | null,
  minimumRole: UserRole
): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.ADMIN]: 5,
    [UserRole.SOC_MANAGER]: 4,
    [UserRole.SOC_ANALYST]: 3,
    [UserRole.AUDITOR]: 2,
    [UserRole.API]: 2,
    [UserRole.VIEWER]: 1,
  };

  return roleHierarchy[user.role] >= roleHierarchy[minimumRole];
}

// ===========================
// PERMISSION GUARDS
// ===========================

/**
 * Create a guard function for checking permissions
 */
export function createPermissionGuard(requiredPermissions: Permission | Permission[]) {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (user: User | null): boolean => {
    return hasAllPermissions(user, permissions);
  };
}

/**
 * Create a guard function for checking role hierarchy
 */
export function createRoleGuard(minimumRole: UserRole) {
  return (user: User | null): boolean => {
    return hasRoleHierarchy(user, minimumRole);
  };
}

// ===========================
// MIDDLEWARE UTILITIES
// ===========================

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check user permissions with detailed result
 */
export function checkPermissions(
  user: User | null,
  requiredPermissions: Permission | Permission[]
): PermissionCheckResult {
  if (!user || !user.id) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const userPermissions = getPermissionsForRole(user.role);

  for (const permission of permissions) {
    if (!userPermissions.includes(permission)) {
      return {
        allowed: false,
        reason: `User does not have required permission: ${permission}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Audit log for permission-based actions
 */
export interface PermissionAuditLog {
  userId: string;
  action: string;
  resource: string;
  permission: Permission;
  allowed: boolean;
  timestamp: Date;
  ipAddress?: string;
}

export function createAuditLog(
  user: User,
  action: string,
  resource: string,
  permission: Permission,
  ipAddress?: string
): PermissionAuditLog {
  return {
    userId: user.id,
    action,
    resource,
    permission,
    allowed: hasPermission(user, permission),
    timestamp: new Date(),
    ipAddress,
  };
}

// ===========================
// RESOURCE-LEVEL ACCESS CONTROL
// ===========================

/**
 * Check resource ownership
 */
export function isResourceOwner(
  user: User | null,
  ownerId: string
): boolean {
  if (!user) return false;
  return user.id === ownerId;
}

/**
 * Check if user can access resource based on ownership or permissions
 */
export function canAccessResource(
  user: User | null,
  ownerId: string,
  requiredPermission: Permission
): boolean {
  if (!user) return false;

  // Owner always has access
  if (isResourceOwner(user, ownerId)) {
    return true;
  }

  // Check permission-based access
  return hasPermission(user, requiredPermission);
}
