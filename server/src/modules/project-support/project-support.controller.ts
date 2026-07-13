import type { Request, Response } from "express";
import { z } from "zod";
import { getRequestIdentity } from "../iam/authentication.middleware.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { ProjectSupportService } from "./project-support.service.js";

const organizationSchema = z.object({ name: z.string().trim().min(2).max(200) });
const projectSchema = z.object({ organizationId: z.uuid(), name: z.string().trim().min(2).max(200) });
const ticketSchema = z.object({ projectId: z.uuid().nullable().default(null), title: z.string().trim().min(3).max(220), description: z.string().trim().min(10).max(10000) });
const orderRequestSchema = z.object({ projectId: z.uuid(), orderCode: z.string().trim().min(1).max(100), quantity: z.number().positive().max(1000000) });

function customerId(request: Request): string {
  const identity = getRequestIdentity(request);
  if (identity?.type !== "CUSTOMER") throw new ApplicationError(401, 40130, "需要注册客户身份");
  return identity.sub;
}

function metadata(request: Request, response: Response) {
  return { sourceIp: request.ip ?? "unknown", traceId: typeof response.locals.traceId === "string" ? response.locals.traceId : "unknown" };
}

export class ProjectSupportController {
  public constructor(private readonly service: ProjectSupportService) {}

  public readonly workspace = async (request: Request, response: Response): Promise<void> => {
    sendSuccess(response, await this.service.workspace(customerId(request)));
  };

  public readonly createOrganization = async (request: Request, response: Response): Promise<void> => {
    const input = organizationSchema.parse(request.body);
    sendSuccess(response, await this.service.createOrganization(input.name, customerId(request), metadata(request, response)));
  };

  public readonly createProject = async (request: Request, response: Response): Promise<void> => {
    const input = projectSchema.parse(request.body);
    sendSuccess(response, await this.service.createProject(input.organizationId, input.name, customerId(request), metadata(request, response)));
  };

  public readonly createTicket = async (request: Request, response: Response): Promise<void> => {
    const input = ticketSchema.parse(request.body);
    sendSuccess(response, await this.service.createTicket(input.projectId, input.title, input.description, customerId(request), metadata(request, response)));
  };

  public readonly createSampleRequest = async (request: Request, response: Response): Promise<void> => {
    const input = orderRequestSchema.extend({ quantity: z.number().int().positive().max(100000) }).parse(request.body);
    sendSuccess(response, await this.service.createSampleRequest(input.projectId, input.orderCode, input.quantity, customerId(request), metadata(request, response)));
  };

  public readonly createRfqRequest = async (request: Request, response: Response): Promise<void> => {
    const input = orderRequestSchema.parse(request.body);
    sendSuccess(response, await this.service.createRfqRequest(input.projectId, input.orderCode, input.quantity, customerId(request), metadata(request, response)));
  };
}
