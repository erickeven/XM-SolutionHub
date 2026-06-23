import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '../types/auth';

export async function register(data: RegisterInput): Promise<AuthResponse> {
  const { data: res } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
  return res.data;
}

export async function login(data: LoginInput): Promise<AuthResponse> {
  const { data: res } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
  return res.data;
}

export async function getMe(): Promise<AuthUser> {
  const { data: res } = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}