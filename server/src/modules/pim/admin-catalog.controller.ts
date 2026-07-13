import express, { type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { getRequestIdentity } from "../iam/authentication.middleware.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { AdminCatalogService } from "./admin-catalog.service.js";

const codePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$/u;
const productSchema = z.object({
  familyCode: z.string().trim().regex(codePattern),
  familyName: z.string().trim().min(2).max(160),
  productCode: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(10).max(10000),
  skus: z.array(z.object({ orderCode: z.string().trim().regex(codePattern), packageCode: z.string().trim().min(1).max(80) })).min(1).max(100),
  fields: z.record(z.string(), z.unknown()).default({})
});
const solutionSchema = z.object({
  solutionCode: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(10000),
  conditions: z.json(),
  evidence: z.json(),
  resourceLevel: z.enum(["PUBLIC", "REGISTERED", "ORG", "PROJECT", "NDA"]),
  productCodes: z.array(z.string().trim().regex(codePattern)).min(1).max(100)
});
const productCodeSchema = z.object({ productCode: z.string().trim().regex(codePattern) });
const solutionVersionSchema = z.object({ solutionCode: z.string().trim().regex(codePattern), version: z.coerce.number().int().positive() });
const documentVersionSchema = z.object({ documentCode: z.string().trim().regex(codePattern), version: z.coerce.number().int().positive() });
const linkSchema = z.object({ documentCode: z.string().trim().regex(codePattern), relationType: z.enum(["DATASHEET", "APPLICATION_NOTE", "CERTIFICATE", "REPORT"]) });
const evidenceSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  notificationTargets: z.array(z.email()).min(1).max(20),
  recoveryPoint: z.string().trim().min(3).max(255)
});
const uploadHeadersSchema = z.object({
  "x-document-title": z.string().min(2).max(255),
  "x-resource-level": z.enum(["PUBLIC", "REGISTERED", "ORG", "PROJECT", "NDA"]),
  "x-document-language": z.string().min(2).max(20),
  "content-type": z.string()
});

function administratorId(request: Request): string {
  const identity = getRequestIdentity(request);
  if (identity?.type !== "SYSTEM_ADMIN") throw new ApplicationError(403, 40320, "仅系统管理员可执行受控数据发布");
  return identity.sub;
}

function evidence(request: Request) {
  const parsed = evidenceSchema.parse(request.body);
  return { ...parsed, sourceIp: request.ip ?? "unknown" };
}

function traceId(response: Response): string {
  return typeof response.locals.traceId === "string" ? response.locals.traceId : "unknown";
}

function decodedHeader(value: string, name: string): string {
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.length < 2 || decoded.length > 255) throw new Error("INVALID_HEADER_LENGTH");
    return decoded;
  } catch {
    throw new ApplicationError(400, 40041, `${name} 编码无效`);
  }
}

export class AdminCatalogController {
  public readonly rawPdf: RequestHandler = express.raw({ type: "application/pdf", limit: "50mb" });

  public constructor(private readonly service: AdminCatalogService) {}

  public readonly createProduct = async (request: Request, response: Response): Promise<void> => {
    sendSuccess(response, await this.service.createProduct({ ...productSchema.parse(request.body), actorId: administratorId(request) }));
  };

  public readonly publishProduct = async (request: Request, response: Response): Promise<void> => {
    const { productCode } = productCodeSchema.parse(request.params);
    sendSuccess(response, await this.service.publishProduct(productCode, administratorId(request), evidence(request), traceId(response)));
  };

  public readonly createSolution = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    sendSuccess(response, await this.service.createSolution(solutionSchema.parse(request.body)));
  };

  public readonly publishSolution = async (request: Request, response: Response): Promise<void> => {
    const input = solutionVersionSchema.parse(request.params);
    sendSuccess(response, await this.service.publishSolution(input.solutionCode, input.version, administratorId(request), evidence(request), traceId(response)));
  };

  public readonly uploadDocument = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    const params = documentVersionSchema.parse(request.params);
    const headers = uploadHeadersSchema.parse(request.headers);
    const body: unknown = request.body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new ApplicationError(400, 40040, "PDF 原件不能为空");
    sendSuccess(response, await this.service.uploadDocument({
      ...params,
      title: decodedHeader(headers["x-document-title"], "资料标题"),
      resourceLevel: headers["x-resource-level"],
      language: headers["x-document-language"],
      mimeType: headers["content-type"].split(";", 1)[0] ?? "",
      content: body
    }));
  };

  public readonly publishDocument = async (request: Request, response: Response): Promise<void> => {
    const input = documentVersionSchema.parse(request.params);
    sendSuccess(response, await this.service.publishDocument(input.documentCode, input.version, administratorId(request), evidence(request), traceId(response)));
  };

  public readonly linkProductDocument = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    const { productCode } = productCodeSchema.parse(request.params);
    const input = linkSchema.parse(request.body);
    await this.service.linkProductDocument(productCode, input.documentCode, input.relationType);
    sendSuccess(response, { linked: true });
  };

  public readonly linkSolutionDocument = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    const params = solutionVersionSchema.parse(request.params);
    const input = linkSchema.parse(request.body);
    await this.service.linkSolutionDocument(
      params.solutionCode,
      params.version,
      input.documentCode,
      input.relationType
    );
    sendSuccess(response, { linked: true });
  };
}
