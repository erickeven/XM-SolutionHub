export interface RegisterInput {
  email: string;
  password: string;
  privacyAccepted: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}