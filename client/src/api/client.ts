import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse } from '../types/api';

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10_000,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 10_000,
});

apiClient.interceptors.request.use((request) => {
  const token = useAuthStore.getState().accessToken;
  if (token) request.headers.Authorization = `Bearer ${token}`;

  const csrfToken = readCookie('csrf-token');
  if (csrfToken && request.method && request.method.toUpperCase() !== 'GET') {
    request.headers['x-csrf-token'] = csrfToken;
  }
  return request;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiResponse<{ accessToken: string }>>(
        '/auth/refresh',
        {},
        { headers: { 'x-csrf-token': readCookie('csrf-token') ?? '' } },
      )
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;
    const url = request?.url ?? '';
    const isSessionEntry = /\/auth\/(login|register|refresh|password-reset)/.test(
      url,
    );

    if (error.response?.status === 401 && request && !request._retry && !isSessionEntry) {
      request._retry = true;
      try {
        const token = await refreshAccessToken();
        request.headers.Authorization = `Bearer ${token}`;
        return apiClient(request);
      } catch {
        useAuthStore.getState().clearAuth();
      }
    }

    return Promise.reject(error);
  },
);
