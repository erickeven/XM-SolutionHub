import { create } from 'zustand';
import type { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  setAuth: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true }),
  setAccessToken: (token) => set({ accessToken: token }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}));
