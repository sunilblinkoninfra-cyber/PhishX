/**
 * Zustand Auth Store
 * Manages user authentication and session
 */

import { create } from 'zustand';
import { AuthStoreState, User, AuthResponse } from '@/types';

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  loading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data: AuthResponse = await response.json();

      // Store token securely (httpOnly cookie preferred, fallback to localStorage)
      localStorage.setItem('token', data.token);
      localStorage.setItem('expiresAt', data.expiresAt.toString());

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Login failed',
        loading: false,
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('expiresAt');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('expiresAt');

    if (!token || !expiresAt) {
      set({ loading: false });
      return;
    }

    // Check if token is expired
    if (new Date(expiresAt) < new Date()) {
      localStorage.removeItem('token');
      localStorage.removeItem('expiresAt');
      set({ loading: false });
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Session invalid');
      }

      const user: User = await response.json();

      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('expiresAt');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  refreshToken: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      set({ isAuthenticated: false });
      return;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: AuthResponse = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('expiresAt', data.expiresAt.toString());

      set({
        token: data.token,
      });
    } catch (err) {
      set({ isAuthenticated: false });
    }
  },
}));

export const authStore = useAuthStore;
