import type { Request, RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { type AccessSubject } from "../../shared/domain/access-policy.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import { verifyAccessToken, type AccessTokenPayload } from "../../shared/security/signed-token.js";

const anonymous: AccessSubject = {
  type: "ANONYMOUS",
  authenticated: false,
  organizationIds: [],
  projectIds: [],
  ndaIds: []
};
const contexts = new WeakMap<Request, AccessSubject>();
const identities = new WeakMap<Request, AccessTokenPayload>();

export function getRequestAccessSubject(request: Request): AccessSubject {
  return contexts.get(request) ?? anonymous;
}

export function getRequestIdentity(request: Request): AccessTokenPayload | null {
  return identities.get(request) ?? null;
}

export function createOptionalAuthenticationMiddleware(prisma: PrismaClient, secret: string): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.header("authorization");
    if (authorization === undefined) {
      contexts.set(request, anonymous);
      next();
      return;
    }
    if (!authorization.startsWith("Bearer ")) {
      next(new ApplicationError(401, 40103, "Authorization 格式无效"));
      return;
    }
    const payload = verifyAccessToken(authorization.slice(7), secret);
    if (payload === null) {
      next(new ApplicationError(401, 40104, "访问令牌无效或已过期"));
      return;
    }
    try {
      identities.set(request, payload);
      const subject = await prisma.subject.findFirst({
        where: { id: payload.sub, type: payload.type, enabled: true },
        include: {
          organizationMemberships: { where: { status: "ACTIVE" }, select: { organizationId: true } },
          projectMemberships: { where: { status: "ACTIVE" }, select: { projectId: true } }
        }
      });
      if (subject === null) {
        next(new ApplicationError(401, 40104, "访问主体已失效"));
        return;
      }
      const organizationIds = subject.organizationMemberships.map((membership) => membership.organizationId);
      const agreements = organizationIds.length === 0
        ? []
        : await prisma.ndaAgreement.findMany({
            where: {
              organizationId: { in: organizationIds },
              status: "PUBLISHED",
              effectiveAt: { lte: new Date() },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
            },
            select: { id: true }
          });
      contexts.set(request, {
        type: subject.type,
        authenticated: true,
        organizationIds,
        projectIds: subject.projectMemberships.map((membership) => membership.projectId),
        ndaIds: agreements.map((agreement) => agreement.id)
      });
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
