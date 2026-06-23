import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

interface UseAuthResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accessToken && !user) {
      setIsLoading(true);
      authApi
        .getMe()
        .then((me) => setAuth(me, accessToken))
        .catch(() => clearAuth())
        .finally(() => setIsLoading(false));
    }
  }, [accessToken, user, setAuth, clearAuth]);

  const login = async (data: LoginInput) => {
    const res = await authApi.login(data);
    setAuth(res.user, res.accessToken);
  };

  const register = async (data: RegisterInput) => {
    const res = await authApi.register(data);
    setAuth(res.user, res.accessToken);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  };

  return { user, isAuthenticated, isLoading, login, register, logout };
}