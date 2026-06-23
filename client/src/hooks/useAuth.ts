import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';
import { restoreAccessToken } from '../api/client';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

interface UseAuthResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

let bootstrapPromise: Promise<void> | null = null;

function bootstrapSession(): Promise<void> {
  const hasCsrfCookie = document.cookie
    .split(';')
    .some((part) => part.trim().startsWith('csrf-token='));
  if (!hasCsrfCookie) {
    useAuthStore.getState().setInitialized(true);
    return Promise.resolve();
  }

  if (!bootstrapPromise) {
    bootstrapPromise = restoreAccessToken()
      .then(async (token) => {
        const user = await authApi.getMe();
        useAuthStore.getState().setAuth(user, token);
      })
      .catch(() => useAuthStore.getState().clearAuth())
      .finally(() => {
        useAuthStore.getState().setInitialized(true);
      });
  }
  return bootstrapPromise;
}

export function useAuth(): UseAuthResult {
  const state = useAuthStore();

  useEffect(() => {
    if (!state.isInitialized) void bootstrapSession();
  }, [state.isInitialized]);

  const login = async (data: LoginInput) => {
    const result = await authApi.login(data);
    state.setAuth(result.user, result.accessToken);
    state.setInitialized(true);
  };

  const register = async (data: RegisterInput) => {
    const result = await authApi.register(data);
    state.setAuth(result.user, result.accessToken);
    state.setInitialized(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      state.clearAuth();
      state.setInitialized(true);
    }
  };

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: !state.isInitialized,
    login,
    register,
    logout,
  };
}
