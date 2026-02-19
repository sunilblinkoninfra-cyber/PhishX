/**
 * Auth store used by page-level UI routes.
 */

import { create } from 'zustand';
import { APIClient } from '@/services/apiClient';
import { User } from '@/types/api';

interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;

  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const readToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  token: readToken(),
  loading: false,
  error: null,

  setUser: (user: User) => {
    set({ user });
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const result = await APIClient.auth.login(email, password);
      set({
        user: result.user,
        token: result.token,
        isAuthenticated: Boolean(result.token),
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Login failed',
        loading: false,
      });
      throw err;
    }
  },

  logout: () => {
    void APIClient.auth.logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token_id');
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = readToken();
    if (!token) {
      set({ loading: false, isAuthenticated: false, user: null, token: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const user = await APIClient.auth.me();
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token_id');
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Authentication check failed',
      });
    }
  },

  refreshToken: async () => {
    set({ loading: true, error: null });
    try {
      const { token } = await APIClient.auth.refreshToken();
      set({ token, isAuthenticated: Boolean(token), loading: false });
    } catch (err) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Token refresh failed',
      });
      throw err;
    }
  },
}));

export const authStore = useAuthStore;
