export interface ConfigurationView {
  readonly id: string;
  readonly version: number;
  readonly status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
  readonly payload: unknown;
  readonly changeSummary: string;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
}

export interface BreakGlassEvidence {
  readonly reason: string;
  readonly sourceIp: string;
  readonly notificationTargets: readonly string[];
  readonly recoveryPoint: string;
}

export interface ContentConfigRepository {
  list(): Promise<readonly ConfigurationView[]>;
  nextVersion(): Promise<number>;
  createDraft(input: { readonly version: number; readonly payload: unknown; readonly changeSummary: string; readonly createdById: string; readonly rolledBackFromId?: string }): Promise<ConfigurationView>;
  publish(version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string): Promise<ConfigurationView | null>;
  findByVersion(version: number): Promise<ConfigurationView | null>;
}
