import { createHash, randomBytes } from "node:crypto";
import { ApplicationError } from "../../shared/http/application-error.js";
import { hashPassword, verifyPassword } from "../../shared/security/password.js";
import { createAccessToken } from "../../shared/security/signed-token.js";
import type { AuthenticationSubject, IamRepository } from "./iam.repository.js";

export interface SessionResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly subject: Pick<AuthenticationSubject, "id" | "email" | "displayName" | "type">;
}

export interface SessionMetadata {
  readonly sourceIp: string;
  readonly userAgent: string | null;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class IamService {
  public constructor(private readonly repository: IamRepository, private readonly accessTokenSecret: string) {}

  public async register(input: { readonly email: string; readonly displayName: string; readonly password: string }, metadata: SessionMetadata): Promise<SessionResult> {
    if (await this.repository.findAuthenticationSubject(input.email)) {
      throw new ApplicationError(409, 40901, "该邮箱已注册");
    }
    const subject = await this.repository.createCustomer({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password)
    });
    return this.createSession(subject, metadata);
  }

  public async login(email: string, password: string, metadata: SessionMetadata): Promise<SessionResult> {
    const subject = await this.repository.findAuthenticationSubject(email);
    if (subject === null || !subject.enabled || !(await verifyPassword(password, subject.passwordHash))) {
      throw new ApplicationError(401, 40101, "邮箱或密码错误");
    }
    return this.createSession(subject, metadata);
  }

  public async refresh(rawToken: string, metadata: SessionMetadata): Promise<SessionResult> {
    const current = await this.repository.findRefreshSubject(tokenHash(rawToken), new Date());
    if (current === null) throw new ApplicationError(401, 40102, "刷新会话无效或已过期");
    const refreshToken = randomBytes(32).toString("base64url");
    await this.repository.rotateRefreshSession({
      sessionId: current.sessionId,
      subjectId: current.subject.id,
      tokenHash: tokenHash(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...metadata
    });
    return {
      accessToken: createAccessToken({ sub: current.subject.id, type: current.subject.type }, this.accessTokenSecret),
      refreshToken,
      subject: current.subject
    };
  }

  private async createSession(subject: AuthenticationSubject, metadata: SessionMetadata): Promise<SessionResult> {
    const refreshToken = randomBytes(32).toString("base64url");
    await this.repository.createRefreshSession({
      subjectId: subject.id,
      tokenHash: tokenHash(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...metadata
    });
    return {
      accessToken: createAccessToken({ sub: subject.id, type: subject.type }, this.accessTokenSecret),
      refreshToken,
      subject: { id: subject.id, email: subject.email, displayName: subject.displayName, type: subject.type }
    };
  }
}
