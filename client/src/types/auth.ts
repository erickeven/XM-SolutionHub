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
  id: string;
  email: string;
  role: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  roles?: Array<{ id: string; name: string }>;
  permissions?: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
