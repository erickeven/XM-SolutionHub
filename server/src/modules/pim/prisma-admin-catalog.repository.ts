import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { DynamicFieldDefinition } from "../../shared/domain/field-value-policy.js";
import type { BreakGlassEvidence } from "../content-config/content-config.repository.js";
import type {
  AdminCatalogRepository,
  AdminDocumentVersionInput,
  AdminProductInput,
  AdminSolutionInput,
  PublishResult
} from "./admin-catalog.repository.js";

function inputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class PrismaAdminCatalogRepository implements AdminCatalogRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async publishedFieldDefinitions(entityType: string): Promise<readonly DynamicFieldDefinition[]> {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { entityType, configurationVersion: { status: "PUBLISHED" } },
      orderBy: { displayOrder: "asc" }
    });
    return fields.map((field) => ({
      id: field.id,
      code: field.code,
      type: field.type,
      required: field.required,
      enumOptions: Array.isArray(field.enumOptions)
        ? field.enumOptions.filter((item): item is string => typeof item === "string")
        : null
    }));
  }

  public async createProduct(input: AdminProductInput) {
    if (await this.prisma.product.findUnique({ where: { productCode: input.productCode } })) return null;
    return this.prisma.$transaction(async (transaction) => {
      const family = await transaction.productFamily.upsert({
        where: { familyCode: input.familyCode },
        create: { familyCode: input.familyCode, name: input.familyName, description: input.familyName },
        update: { name: input.familyName }
      });
      const product = await transaction.product.create({
        data: {
          familyId: family.id,
          productCode: input.productCode,
          name: input.name,
          summary: input.summary,
          orderableSkus: { create: input.skus.map((sku) => ({ ...sku })) },
          fieldValues: {
            create: input.fieldValues.map((field) => ({
              fieldDefinitionId: field.fieldDefinitionId,
              textValue: field.textValue,
              numberValue: field.numberValue,
              booleanValue: field.booleanValue,
              dateValue: field.dateValue,
              fileVersionId: field.fileVersionId,
              source: "ADMIN_CONTROLLED_ENTRY",
              reviewedById: input.actorId,
              reviewedAt: new Date()
            }))
          }
        }
      });
      return { productCode: product.productCode, status: product.status };
    });
  }

  public publishProduct(productCode: string, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    return this.prisma.$transaction(async (transaction): Promise<PublishResult | null> => {
      const product = await transaction.product.findUnique({
        where: { productCode },
        include: { orderableSkus: true }
      });
      if (product === null || product.status === "PUBLISHED" || product.orderableSkus.length === 0) return null;
      const updated = await transaction.product.update({
        where: { id: product.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          orderableSkus: { updateMany: { where: {}, data: { status: "PUBLISHED" } } }
        }
      });
      await this.recordPublication(transaction, actorId, evidence, traceId, "Product", product.id, product.status, updated.status);
      return { id: updated.id, status: updated.status };
    });
  }

  public async createSolution(input: AdminSolutionInput) {
    if (await this.prisma.solution.findUnique({ where: { solutionCode: input.solutionCode } })) return null;
    const products = await this.prisma.product.findMany({
      where: { productCode: { in: [...new Set(input.productCodes)] }, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: { id: true, productCode: true }
    });
    if (products.length !== new Set(input.productCodes).size) return null;
    const solution = await this.prisma.solution.create({
      data: {
        solutionCode: input.solutionCode,
        name: input.name,
        summary: input.summary,
        versions: {
          create: {
            version: 1,
            conditions: inputJson(input.conditions),
            evidence: inputJson(input.evidence),
            resourceLevel: input.resourceLevel,
            productFits: {
              create: products.map((product) => ({
                productId: product.id,
                fitRules: { source: "ADMIN_CONTROLLED_ENTRY" },
                evidenceSource: "ADMIN_CONTROLLED_ENTRY"
              }))
            }
          }
        }
      },
      include: { versions: { select: { version: true, status: true } } }
    });
    const version = solution.versions[0];
    if (version === undefined) throw new Error("SOLUTION_VERSION_NOT_CREATED");
    return { solutionCode: solution.solutionCode, version: version.version, status: version.status };
  }

  public publishSolution(solutionCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    return this.prisma.$transaction(async (transaction): Promise<PublishResult | null> => {
      const target = await transaction.solutionVersion.findFirst({
        where: { version, solution: { solutionCode } },
        include: { productFits: { include: { product: true } } }
      });
      if (
        target === null || target.status === "PUBLISHED" || target.productFits.length === 0 ||
        target.productFits.some((fit) => fit.product.status !== "PUBLISHED")
      ) return null;
      const updated = await transaction.solutionVersion.update({
        where: { id: target.id },
        data: { status: "PUBLISHED", effectiveAt: new Date() }
      });
      await this.recordPublication(transaction, actorId, evidence, traceId, "SolutionVersion", target.id, target.status, updated.status);
      return { id: updated.id, status: updated.status };
    });
  }

  public async createDocumentVersion(input: AdminDocumentVersionInput) {
    const document = await this.prisma.document.upsert({
      where: { documentCode: input.documentCode },
      create: { documentCode: input.documentCode, title: input.title },
      update: { title: input.title }
    });
    if (await this.prisma.documentVersion.findUnique({ where: { documentId_version: { documentId: document.id, version: input.version } } })) return null;
    const version = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.documentVersion.create({
        data: {
          documentId: document.id,
          version: input.version,
          resourceLevel: input.resourceLevel,
          language: input.language,
          mimeType: input.mimeType,
          originalObjectKey: input.originalObjectKey,
          sha256: input.sha256
        }
      });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: "DocumentVersion",
          aggregateId: created.id,
          eventType: "document.preview.requested",
          payload: { documentVersionId: created.id },
          idempotencyKey: `document.preview.requested:${created.id}:${created.sha256}`
        }
      });
      return created;
    });
    return { documentCode: document.documentCode, version: version.version, status: version.status, documentVersionId: version.id };
  }

  public publishDocument(documentCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    return this.prisma.$transaction(async (transaction): Promise<PublishResult | null> => {
      const target = await transaction.documentVersion.findFirst({
        where: { version, document: { documentCode } },
        include: { derivatives: true }
      });
      if (
        target === null || target.status === "PUBLISHED" ||
        !target.derivatives.some((item) => item.type === "PREVIEW_PDF" && item.status === "SUCCEEDED") ||
        !target.derivatives.some((item) => item.type === "ANONYMOUS_PREVIEW_PDF" && item.status === "SUCCEEDED")
      ) return null;
      const updated = await transaction.documentVersion.update({
        where: { id: target.id },
        data: { status: "PUBLISHED", effectiveAt: new Date() }
      });
      await this.recordPublication(transaction, actorId, evidence, traceId, "DocumentVersion", target.id, target.status, updated.status);
      return { id: updated.id, status: updated.status };
    });
  }

  public async linkProductDocument(productCode: string, documentCode: string, relationType: string): Promise<void | null> {
    const [product, document] = await Promise.all([
      this.prisma.product.findUnique({ where: { productCode } }),
      this.prisma.document.findUnique({ where: { documentCode } })
    ]);
    if (product === null || document === null) return null;
    const existing = await this.prisma.documentLink.findFirst({
      where: { productId: product.id, documentId: document.id, relationType }
    });
    if (existing === null) {
      await this.prisma.documentLink.create({
        data: { productId: product.id, documentId: document.id, relationType }
      });
    }
  }

  public async linkSolutionDocument(
    solutionCode: string,
    version: number,
    documentCode: string,
    relationType: string
  ): Promise<void | null> {
    const [solutionVersion, document] = await Promise.all([
      this.prisma.solutionVersion.findFirst({ where: { version, solution: { solutionCode } } }),
      this.prisma.document.findUnique({ where: { documentCode } })
    ]);
    if (solutionVersion === null || document === null) return null;
    const existing = await this.prisma.documentLink.findFirst({
      where: { solutionVersionId: solutionVersion.id, documentId: document.id, relationType }
    });
    if (existing === null) {
      await this.prisma.documentLink.create({
        data: { solutionVersionId: solutionVersion.id, documentId: document.id, relationType }
      });
    }
  }

  private async recordPublication(
    transaction: Prisma.TransactionClient,
    actorId: string,
    evidence: BreakGlassEvidence,
    traceId: string,
    targetType: string,
    targetId: string,
    beforeStatus: string,
    afterStatus: string
  ): Promise<void> {
    await transaction.breakGlassUse.create({
      data: {
        actorId,
        reason: evidence.reason,
        targetType,
        targetId,
        beforeValue: { status: beforeStatus },
        afterValue: { status: afterStatus },
        sourceIp: evidence.sourceIp,
        notificationTargets: [...evidence.notificationTargets],
        recoveryPoint: evidence.recoveryPoint
      }
    });
    await transaction.auditEvent.create({
      data: {
        actorId,
        action: `${targetType}.publish.override`,
        targetType,
        targetId,
        beforeValue: { status: beforeStatus },
        afterValue: { status: afterStatus },
        sourceIp: evidence.sourceIp,
        traceId,
        authorizationResult: "SYSTEM_ADMIN_BREAK_GLASS"
      }
    });
    await transaction.outboxEvent.create({
      data: {
        aggregateType: targetType,
        aggregateId: targetId,
        eventType: `${targetType}.published`,
        payload: { targetId },
        idempotencyKey: `${targetType}.published:${targetId}`
      }
    });
  }
}
