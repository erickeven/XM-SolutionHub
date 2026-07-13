export const resourceLevels = ["PUBLIC", "REGISTERED", "ORG", "PROJECT", "NDA"] as const;

export type ResourceLevelName = (typeof resourceLevels)[number];
export type AccessAction = "PREVIEW" | "DOWNLOAD" | "OVERRIDE";
export type AccessSubjectType = "ANONYMOUS" | "CUSTOMER" | "INTERNAL" | "SYSTEM_ADMIN";

export interface AccessSubject {
  readonly type: AccessSubjectType;
  readonly authenticated: boolean;
  readonly organizationIds: readonly string[];
  readonly projectIds: readonly string[];
  readonly ndaIds: readonly string[];
}

export interface ProtectedResource {
  readonly level: ResourceLevelName;
  readonly organizationId?: string;
  readonly projectId?: string;
  readonly ndaId?: string;
  readonly publicDownloadAllowed: boolean;
}

export interface AccessDecision {
  readonly allowed: boolean;
  readonly previewPageLimit: number | null;
  readonly requiresBreakGlass: boolean;
  readonly reason: string;
}

function denied(reason: string): AccessDecision {
  return { allowed: false, previewPageLimit: null, requiresBreakGlass: false, reason };
}

export function decideResourceAccess(
  subject: AccessSubject,
  resource: ProtectedResource,
  action: AccessAction
): AccessDecision {
  if (subject.type === "SYSTEM_ADMIN") {
    return {
      allowed: true,
      previewPageLimit: null,
      requiresBreakGlass: action === "OVERRIDE" || resource.level !== "PUBLIC",
      reason: "SYSTEM_ADMIN_FINAL_AUTHORITY"
    };
  }
  if (action === "OVERRIDE") return denied("SYSTEM_ADMIN_REQUIRED");
  if (resource.level === "PUBLIC") {
    if (action === "PREVIEW") {
      return {
        allowed: true,
        previewPageLimit: subject.authenticated ? null : 3,
        requiresBreakGlass: false,
        reason: subject.authenticated ? "PUBLIC_FULL_PREVIEW" : "PUBLIC_ANONYMOUS_THREE_PAGES"
      };
    }
    return resource.publicDownloadAllowed
      ? { allowed: true, previewPageLimit: null, requiresBreakGlass: false, reason: "PUBLIC_DOWNLOAD_ENABLED" }
      : denied("PUBLIC_DOWNLOAD_DISABLED");
  }
  if (!subject.authenticated) return denied("AUTHENTICATION_REQUIRED");
  if (resource.level === "REGISTERED") {
    return { allowed: true, previewPageLimit: null, requiresBreakGlass: false, reason: "REGISTERED_ACCESS" };
  }
  if (resource.level === "ORG") {
    return resource.organizationId !== undefined && subject.organizationIds.includes(resource.organizationId)
      ? { allowed: true, previewPageLimit: null, requiresBreakGlass: false, reason: "ORGANIZATION_GRANT" }
      : denied("ORGANIZATION_GRANT_REQUIRED");
  }
  if (resource.level === "PROJECT") {
    return resource.projectId !== undefined && subject.projectIds.includes(resource.projectId)
      ? { allowed: true, previewPageLimit: null, requiresBreakGlass: false, reason: "PROJECT_GRANT" }
      : denied("PROJECT_GRANT_REQUIRED");
  }
  return resource.ndaId !== undefined && subject.ndaIds.includes(resource.ndaId)
    ? { allowed: true, previewPageLimit: null, requiresBreakGlass: false, reason: "NDA_GRANT" }
    : denied("NDA_GRANT_REQUIRED");
}
