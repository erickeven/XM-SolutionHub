import type { Request, Response } from "express";
import { z } from "zod";
import { getRequestIdentity } from "../iam/authentication.middleware.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { SupplyQualityService } from "./supply-quality.service.js";

const codeSchema = z.object({ ticketCode: z.string().trim().min(1).max(100) });
const conclusionSchema = z.object({ conclusion: z.json() });

function internalIdentity(request: Request) {
  const identity = getRequestIdentity(request);
  if (identity === null || identity.type === "CUSTOMER") throw new ApplicationError(403, 40342, "仅芯茂微内部身份可访问作业队列");
  return { subjectId: identity.sub, administrator: identity.type === "SYSTEM_ADMIN" };
}

export class SupplyQualityController {
  public constructor(private readonly service: SupplyQualityService) {}

  public readonly workbench = async (request: Request, response: Response): Promise<void> => {
    const identity = internalIdentity(request);
    sendSuccess(response, await this.service.workbench(identity.subjectId, identity.administrator));
  };

  public readonly assign = async (request: Request, response: Response): Promise<void> => {
    const { ticketCode } = codeSchema.parse(request.params);
    const identity = internalIdentity(request);
    sendSuccess(response, await this.service.assign(ticketCode, identity.subjectId, identity.administrator));
  };

  public readonly resolve = async (request: Request, response: Response): Promise<void> => {
    const { ticketCode } = codeSchema.parse(request.params);
    const { conclusion } = conclusionSchema.parse(request.body);
    const identity = internalIdentity(request);
    sendSuccess(response, await this.service.resolve({
      ticketCode,
      subjectId: identity.subjectId,
      administrator: identity.administrator,
      conclusion,
      sourceIp: request.ip ?? "unknown",
      traceId: typeof response.locals.traceId === "string" ? response.locals.traceId : "unknown"
    }));
  };
}
