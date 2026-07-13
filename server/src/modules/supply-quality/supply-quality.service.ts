import { ApplicationError } from "../../shared/http/application-error.js";
import type { SupplyQualityRepository } from "./supply-quality.repository.js";

export class SupplyQualityService {
  public constructor(private readonly repository: SupplyQualityRepository) {}

  public workbench(subjectId: string, administrator: boolean) {
    return this.repository.workbench(subjectId, administrator);
  }

  public async assign(ticketCode: string, subjectId: string, administrator: boolean) {
    const ticket = await this.repository.assignSupportTicket(ticketCode, subjectId, administrator);
    if (ticket === null) throw new ApplicationError(403, 40340, "工单不可认领或当前角色无权认领");
    return ticket;
  }

  public async resolve(input: { readonly ticketCode: string; readonly subjectId: string; readonly administrator: boolean; readonly conclusion: unknown; readonly sourceIp: string; readonly traceId: string }) {
    const ticket = await this.repository.resolveSupportTicket({
      ticketCode: input.ticketCode,
      subjectId: input.subjectId,
      systemAdministrator: input.administrator,
      conclusion: input.conclusion,
      sourceIp: input.sourceIp,
      traceId: input.traceId
    });
    if (ticket === null) throw new ApplicationError(403, 40341, "只有已分配 FAE 或系统管理员可以结案");
    return ticket;
  }
}
