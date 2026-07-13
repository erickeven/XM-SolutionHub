import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AuthenticationSubject, IamRepository, RefreshSubject } from "./iam.repository.js";

function mapAuthenticationSubject(subject: {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly type: AuthenticationSubject["type"];
  readonly enabled: boolean;
  readonly passwordCredential: { readonly passwordHash: string } | null;
}): AuthenticationSubject | null {
  return subject.passwordCredential === null ? null : { ...subject, passwordHash: subject.passwordCredential.passwordHash };
}

export class PrismaIamRepository implements IamRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findAuthenticationSubject(email: string): Promise<AuthenticationSubject | null> {
    const subject = await this.prisma.subject.findUnique({ where: { email }, include: { passwordCredential: true } });
    return subject === null ? null : mapAuthenticationSubject(subject);
  }

  public async createCustomer(input: { readonly email: string; readonly displayName: string; readonly passwordHash: string }): Promise<AuthenticationSubject> {
    const subject = await this.prisma.subject.create({
      data: {
        type: "CUSTOMER",
        email: input.email,
        displayName: input.displayName,
        customerProfile: { create: {} },
        passwordCredential: { create: { passwordHash: input.passwordHash } }
      },
      include: { passwordCredential: true }
    });
    const mapped = mapAuthenticationSubject(subject);
    if (mapped === null) throw new Error("CUSTOMER_CREDENTIAL_NOT_CREATED");
    return mapped;
  }

  public async createRefreshSession(input: { readonly subjectId: string; readonly tokenHash: string; readonly expiresAt: Date; readonly sourceIp: string; readonly userAgent: string | null }): Promise<void> {
    await this.prisma.refreshSession.create({ data: input });
  }

  public async findRefreshSubject(tokenHash: string, now: Date): Promise<RefreshSubject | null> {
    const session = await this.prisma.refreshSession.findFirst({
      where: { tokenHash, revokedAt: null, rotatedAt: null, expiresAt: { gt: now }, subject: { enabled: true } },
      include: { subject: true }
    });
    return session === null
      ? null
      : {
          sessionId: session.id,
          subject: {
            id: session.subject.id,
            email: session.subject.email,
            displayName: session.subject.displayName,
            type: session.subject.type,
            enabled: session.subject.enabled
          }
        };
  }

  public async rotateRefreshSession(input: { readonly sessionId: string; readonly subjectId: string; readonly tokenHash: string; readonly expiresAt: Date; readonly sourceIp: string; readonly userAgent: string | null }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshSession.update({ where: { id: input.sessionId }, data: { rotatedAt: new Date() } }),
      this.prisma.refreshSession.create({
        data: {
          subjectId: input.subjectId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          sourceIp: input.sourceIp,
          userAgent: input.userAgent
        }
      })
    ]);
  }
}
