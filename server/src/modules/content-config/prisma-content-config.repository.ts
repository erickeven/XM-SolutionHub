import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { BreakGlassEvidence, ConfigurationView, ContentConfigRepository } from "./content-config.repository.js";

function toInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

export class PrismaContentConfigRepository implements ContentConfigRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public list(): Promise<readonly ConfigurationView[]> {
    return this.prisma.configurationVersion.findMany({ orderBy: { version: "desc" } });
  }

  public async nextVersion(): Promise<number> {
    const aggregate = await this.prisma.configurationVersion.aggregate({ _max: { version: true } });
    return (aggregate._max.version ?? 0) + 1;
  }

  public createDraft(input: { readonly version: number; readonly payload: unknown; readonly changeSummary: string; readonly createdById: string; readonly rolledBackFromId?: string }): Promise<ConfigurationView> {
    return this.prisma.configurationVersion.create({
      data: {
        version: input.version,
        payload: input.payload as Prisma.InputJsonValue,
        changeSummary: input.changeSummary,
        createdById: input.createdById,
        ...(input.rolledBackFromId === undefined ? {} : { rolledBackFromId: input.rolledBackFromId })
      }
    });
  }

  public async publish(
    version: number,
    actorId: string,
    evidence: BreakGlassEvidence,
    traceId: string
  ): Promise<ConfigurationView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const target = await transaction.configurationVersion.findUnique({ where: { version } });
      if (target === null || (target.status !== "DRAFT" && target.status !== "IN_REVIEW")) return null;
      const current = await transaction.configurationVersion.findFirst({ where: { status: "PUBLISHED" } });
      await transaction.configurationVersion.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED" }
      });
      const published = await transaction.configurationVersion.update({
        where: { id: target.id },
        data: { status: "PUBLISHED", publishedAt: new Date() }
      });
      await transaction.breakGlassUse.create({
        data: {
          actorId,
          reason: evidence.reason,
          targetType: "ConfigurationVersion",
          targetId: target.id,
          beforeValue: current === null ? Prisma.JsonNull : toInputJson(current.payload),
          afterValue: toInputJson(target.payload),
          sourceIp: evidence.sourceIp,
          notificationTargets: [...evidence.notificationTargets],
          recoveryPoint: evidence.recoveryPoint
        }
      });
      await transaction.auditEvent.create({
        data: {
          actorId,
          action: "configuration.publish.override",
          targetType: "ConfigurationVersion",
          targetId: target.id,
          beforeValue: current === null ? Prisma.JsonNull : toInputJson(current.payload),
          afterValue: toInputJson(target.payload),
          sourceIp: evidence.sourceIp,
          traceId,
          authorizationResult: "SYSTEM_ADMIN_BREAK_GLASS"
        }
      });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: "ConfigurationVersion",
          aggregateId: target.id,
          eventType: "configuration.published",
          payload: { version: target.version },
          idempotencyKey: `configuration.published:${target.id}`
        }
      });
      return published;
    });
  }

  public findByVersion(version: number): Promise<ConfigurationView | null> {
    return this.prisma.configurationVersion.findUnique({ where: { version } });
  }
}
