import { ApplicationError } from "../../shared/http/application-error.js";
import type { BreakGlassEvidence, ConfigurationView, ContentConfigRepository } from "./content-config.repository.js";

export class ContentConfigService {
  public constructor(private readonly repository: ContentConfigRepository) {}

  public list(): Promise<readonly ConfigurationView[]> {
    return this.repository.list();
  }

  public async createDraft(payload: unknown, changeSummary: string, actorId: string): Promise<ConfigurationView> {
    return this.repository.createDraft({
      version: await this.repository.nextVersion(),
      payload,
      changeSummary,
      createdById: actorId
    });
  }

  public async publish(
    version: number,
    actorId: string,
    evidence: BreakGlassEvidence,
    traceId: string
  ): Promise<ConfigurationView> {
    const published = await this.repository.publish(version, actorId, evidence, traceId);
    if (published === null) throw new ApplicationError(409, 40930, "配置版本不存在或当前状态不可发布");
    return published;
  }

  public async rollback(
    sourceVersion: number,
    actorId: string,
    evidence: BreakGlassEvidence,
    traceId: string
  ): Promise<ConfigurationView> {
    const source = await this.repository.findByVersion(sourceVersion);
    if (source === null) throw new ApplicationError(404, 40440, "回滚源配置版本不存在");
    const draft = await this.repository.createDraft({
      version: await this.repository.nextVersion(),
      payload: source.payload,
      changeSummary: `回滚到配置版本 ${sourceVersion}`,
      createdById: actorId,
      rolledBackFromId: source.id
    });
    return this.publish(draft.version, actorId, evidence, traceId);
  }
}
