import { randomUUID } from "node:crypto";
import { ApplicationError } from "../../shared/http/application-error.js";
import type { CustomerWorkspaceView, ProjectSupportRepository } from "./project-support.repository.js";

export interface ActionMetadata { readonly sourceIp: string; readonly traceId: string }

function code(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export class ProjectSupportService {
  public constructor(private readonly repository: ProjectSupportRepository) {}

  public workspace(subjectId: string): Promise<CustomerWorkspaceView> {
    return this.repository.workspace(subjectId);
  }

  public createOrganization(name: string, subjectId: string, metadata: ActionMetadata) {
    return this.repository.createOrganization({ orgCode: code("ORG"), name, subjectId, ...metadata });
  }

  public async createProject(organizationId: string, name: string, subjectId: string, metadata: ActionMetadata) {
    const project = await this.repository.createProject({ organizationId, projectCode: code("PRJ"), name, subjectId, ...metadata });
    if (project === null) throw new ApplicationError(403, 40330, "只有企业管理者可以创建项目");
    return project;
  }

  public async createTicket(projectId: string | null, title: string, description: string, subjectId: string, metadata: ActionMetadata) {
    const ticket = await this.repository.createTicket({ ticketCode: code("SUP"), projectId, title, description, subjectId, ...metadata });
    if (ticket === null) throw new ApplicationError(403, 40331, "不能为未授权项目创建支持工单");
    return ticket;
  }

  public async createSampleRequest(projectId: string, orderCode: string, quantity: number, subjectId: string, metadata: ActionMetadata) {
    const request = await this.repository.createSampleRequest({ projectId, orderCode, quantity, subjectId, ...metadata });
    if (request === null) throw new ApplicationError(403, 40332, "样品申请要求有效项目成员和已上架料号");
    return request;
  }

  public async createRfqRequest(projectId: string, orderCode: string, quantity: number, subjectId: string, metadata: ActionMetadata) {
    const request = await this.repository.createRfqRequest({ projectId, orderCode, quantity, subjectId, ...metadata });
    if (request === null) throw new ApplicationError(403, 40333, "RFQ 要求有效项目成员和已上架料号");
    return request;
  }
}
