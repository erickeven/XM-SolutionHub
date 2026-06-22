export type UserRole = 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
export type UserStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface UserInfo {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface RegisterInput {
  email: string;
  password: string;
  privacyAccepted: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
  csrfToken: string;
}

export interface PasswordResetInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  familyId: string;
}

export interface AuthResponse {
  user: UserInfo;
  accessToken: string;
}

export interface LoginResult {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResult {
  resetLink: string;
}