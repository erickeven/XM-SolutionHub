import type { Request, Response } from "express";
import { z } from "zod";
import { getRequestIdentity } from "../iam/authentication.middleware.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { ContentConfigService } from "./content-config.service.js";
import type { FieldDefinitionsService } from "./field-definitions.service.js";

const versionSchema = z.object({ version: z.coerce.number().int().positive() });
const draftSchema = z.object({ payload: z.json(), changeSummary: z.string().trim().min(3).max(1000) });
const evidenceSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  notificationTargets: z.array(z.string().trim().min(1).max(320)).min(1).max(20),
  recoveryPoint: z.string().trim().min(3).max(255)
});
const fieldQuerySchema = z.object({ entityType: z.string().trim().min(1).max(60).optional() });
const fieldSchema = z.object({
  entityType: z.string().trim().min(1).max(60),
  code: z.string().trim().regex(/^[a-z][a-z0-9_]{1,79}$/u),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "ENUM", "DATE", "FILE"]),
  unit: z.string().trim().max(40).nullable().default(null),
  enumOptions: z.array(z.string().trim().min(1).max(120)).max(100).nullable().default(null),
  validation: z.json().default({}),
  visibility: z.json().default({}),
  displayOrder: z.number().int().min(0).max(10000).default(0),
  required: z.boolean().default(false)
});

function administratorId(request: Request): string {
  const identity = getRequestIdentity(request);
  if (identity?.type !== "SYSTEM_ADMIN") throw new ApplicationError(403, 40320, "仅系统管理员可执行配置治理");
  return identity.sub;
}

function traceId(response: Response): string {
  return typeof response.locals.traceId === "string" ? response.locals.traceId : "unknown";
}

export class ContentConfigController {
  public constructor(
    private readonly service: ContentConfigService,
    private readonly fields: FieldDefinitionsService
  ) {}

  public readonly list = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    sendSuccess(response, await this.service.list());
  };

  public readonly createDraft = async (request: Request, response: Response): Promise<void> => {
    const input = draftSchema.parse(request.body);
    sendSuccess(response, await this.service.createDraft(input.payload, input.changeSummary, administratorId(request)));
  };

  public readonly publish = async (request: Request, response: Response): Promise<void> => {
    const { version } = versionSchema.parse(request.params);
    const evidence = evidenceSchema.parse(request.body);
    sendSuccess(response, await this.service.publish(version, administratorId(request), {
      ...evidence,
      sourceIp: request.ip ?? "unknown"
    }, traceId(response)));
  };

  public readonly rollback = async (request: Request, response: Response): Promise<void> => {
    const { version } = versionSchema.parse(request.params);
    const evidence = evidenceSchema.parse(request.body);
    sendSuccess(response, await this.service.rollback(version, administratorId(request), {
      ...evidence,
      sourceIp: request.ip ?? "unknown"
    }, traceId(response)));
  };

  public readonly listFields = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    const { version } = versionSchema.parse(request.params);
    const { entityType } = fieldQuerySchema.parse(request.query);
    sendSuccess(response, await this.fields.list(version, entityType));
  };

  public readonly upsertField = async (request: Request, response: Response): Promise<void> => {
    administratorId(request);
    const { version } = versionSchema.parse(request.params);
    sendSuccess(response, await this.fields.upsert(version, fieldSchema.parse(request.body)));
  };
}
