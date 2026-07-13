import { createHash } from "node:crypto";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import { validateDynamicFieldSet } from "../../shared/domain/field-value-policy.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import type { BreakGlassEvidence } from "../content-config/content-config.repository.js";
import type { AdminCatalogRepository, AdminSolutionInput } from "./admin-catalog.repository.js";

export class AdminCatalogService {
  public constructor(
    private readonly repository: AdminCatalogRepository,
    private readonly storage: ObjectStorageAdapter
  ) {}

  public async createProduct(input: {
    readonly familyCode: string;
    readonly familyName: string;
    readonly productCode: string;
    readonly name: string;
    readonly summary: string;
    readonly skus: readonly { readonly orderCode: string; readonly packageCode: string }[];
    readonly fields: Readonly<Record<string, unknown>>;
    readonly actorId: string;
  }) {
    const definitions = await this.repository.publishedFieldDefinitions("product");
    const product = await this.repository.createProduct({
      ...input,
      fieldValues: validateDynamicFieldSet(definitions, input.fields)
    });
    if (product === null) throw new ApplicationError(409, 40940, "产品编码已存在");
    return product;
  }

  public async publishProduct(productCode: string, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    const result = await this.repository.publishProduct(productCode, actorId, evidence, traceId);
    if (result === null) throw new ApplicationError(409, 40941, "产品不可发布：请确认草稿状态和可订货料号");
    return result;
  }

  public async createSolution(input: AdminSolutionInput) {
    const solution = await this.repository.createSolution(input);
    if (solution === null) throw new ApplicationError(409, 40942, "方案编码重复，或关联产品尚未发布");
    return solution;
  }

  public async publishSolution(solutionCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    const result = await this.repository.publishSolution(solutionCode, version, actorId, evidence, traceId);
    if (result === null) throw new ApplicationError(409, 40943, "方案不可发布：请确认版本和关联产品发布状态");
    return result;
  }

  public async uploadDocument(input: {
    readonly documentCode: string;
    readonly title: string;
    readonly version: number;
    readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
    readonly language: string;
    readonly mimeType: string;
    readonly content: Buffer;
  }) {
    if (input.mimeType !== "application/pdf") {
      throw new ApplicationError(415, 41501, "第一阶段正式上传仅接受 PDF；Office 文件进入转换 Adapter 队列");
    }
    const sha256 = createHash("sha256").update(input.content).digest("hex");
    const objectKey = `documents/${input.documentCode}/versions/${input.version}/${sha256}/original.pdf`;
    await this.storage.putObject(objectKey, input.content, input.mimeType);
    const version = await this.repository.createDocumentVersion({
      documentCode: input.documentCode,
      title: input.title,
      version: input.version,
      resourceLevel: input.resourceLevel,
      language: input.language,
      mimeType: input.mimeType,
      originalObjectKey: objectKey,
      sha256
    });
    if (version === null) throw new ApplicationError(409, 40944, "资料版本已存在");
    return version;
  }

  public async publishDocument(documentCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string) {
    const result = await this.repository.publishDocument(documentCode, version, actorId, evidence, traceId);
    if (result === null) throw new ApplicationError(409, 40945, "资料不可发布：请确认完整和匿名预览派生物均已成功");
    return result;
  }

  public async linkProductDocument(productCode: string, documentCode: string, relationType: string): Promise<void> {
    const result = await this.repository.linkProductDocument(productCode, documentCode, relationType);
    if (result === null) throw new ApplicationError(404, 40450, "产品或资料不存在");
  }

  public async linkSolutionDocument(
    solutionCode: string,
    version: number,
    documentCode: string,
    relationType: string
  ): Promise<void> {
    const result = await this.repository.linkSolutionDocument(solutionCode, version, documentCode, relationType);
    if (result === null) throw new ApplicationError(404, 40451, "方案版本或资料不存在");
  }
}
