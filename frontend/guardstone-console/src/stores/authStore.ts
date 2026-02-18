/**
 * Authentication & Authorization Store
 * Zustand store for user authentication, role-based access control, and permissions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AuthContext,
  AuthToken,
  Permission,
  User,
  UserRole,
  RolePermissionMap,
} from '@/types';

// ===========================
// ROLE PERMISSION MAPPING
// ===========================

const rolePermissions: RolePermissionMap = {
  [UserRole.ADMIN]: [
    // All permissions
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
    // API role gets limited permissions based on configuration
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
// STORE INTERFACE
// ===========================

interface AuthStoreState {
  user: User | null;
  token: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: Permission[];
  sessionExpiry: Date | null;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: AuthToken) => void;
  setPermissions: (role: UserRole) => void;
  login: (user: User, token: AuthToken) => void;
  logout: () => void;
  refreshToken: (token: AuthToken) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: Permission) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  validateToken: () => boolean;
}

// ===========================
// ZUSTAND STORE
// ===========================

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: [],
      sessionExpiry: null,

      setUser: (user: User) => set({ user }),

      setToken: (token: AuthToken) =>
        set({
          token,
          sessionExpiry: new Date(Date.now() + token.expiresIn * 1000),
        }),

      setPermissions: (role: UserRole) =>
        set({
          permissions: rolePermissions[role] || [],
        }),

      login: (user: User, token: AuthToken) => {
        const permissions = rolePermissions[user.role] || [];
        set({
          user,
          token,
          isAuthenticated: true,
          permissions,
          sessionExpiry: new Date(Date.now() + token.expiresIn * 1000),
          error: null,
        });
      },

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
          sessionExpiry: null,
          error: null,
        }),

      refreshToken: (token: AuthToken) =>
        set({
          token,
          sessionExpiry: new Date(Date.now() + token.expiresIn * 1000),
        }),

      setError: (error: string | null) => set({ error }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      hasPermission: (permission: Permission): boolean => {
        return get().permissions.includes(permission);
      },

      canAccess: (resource: string, action: string): boolean => {
        const { permissions } = get();
        const permissionKey = `${action}_${resource}`.toUpperCase().replace(/-/g, '_');
        return permissions.includes(permissionKey as Permission);
      },

      validateToken: (): boolean => {
        const { token, sessionExpiry } = get();
        if (!token || !sessionExpiry) return false;
        return new Date() < sessionExpiry;
      },
    }),
    {
      name: 'guardstone-auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);

// ===========================
// HELPER FUNCTIONS
// ===========================

export const getPermissionsForRole = (role: UserRole): Permission[] => {
  return rolePermissions[role] || [];
};

export const canUserPerformAction = (
  user: User | null,
  action: Permission
): boolean => {
  if (!user) return false;
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(action);
};

export const createMockAuthToken = (expiresInHours: number = 24): AuthToken => ({
  accessToken: `mock_${Date.now()}_${Math.random()}`,
  refreshToken: `refresh_${Date.now()}_${Math.random()}`,
  expiresIn: expiresInHours * 3600,
  tokenType: 'Bearer',
});
