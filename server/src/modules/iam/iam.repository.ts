export interface AuthenticationSubject {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly type: "CUSTOMER" | "INTERNAL" | "SYSTEM_ADMIN";
  readonly enabled: boolean;
  readonly passwordHash: string;
}

export interface RefreshSubject {
  readonly sessionId: string;
  readonly subject: Omit<AuthenticationSubject, "passwordHash">;
}

export interface IamRepository {
  findAuthenticationSubject(email: string): Promise<AuthenticationSubject | null>;
  createCustomer(input: { readonly email: string; readonly displayName: string; readonly passwordHash: string }): Promise<AuthenticationSubject>;
  createRefreshSession(input: { readonly subjectId: string; readonly tokenHash: string; readonly expiresAt: Date; readonly sourceIp: string; readonly userAgent: string | null }): Promise<void>;
  findRefreshSubject(tokenHash: string, now: Date): Promise<RefreshSubject | null>;
  rotateRefreshSession(input: { readonly sessionId: string; readonly subjectId: string; readonly tokenHash: string; readonly expiresAt: Date; readonly sourceIp: string; readonly userAgent: string | null }): Promise<void>;
}
