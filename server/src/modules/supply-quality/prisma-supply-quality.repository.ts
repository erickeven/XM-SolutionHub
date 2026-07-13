import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { InternalWorkbenchView, SupplyQualityRepository } from "./supply-quality.repository.js";

const faeRoles = ["fae", "engineering_manager"];
const sampleRoles = ["sample_assistant", "customer_service_manager"];
const rfqRoles = ["order_assistant", "customer_service_manager", "sales", "sales_manager"];
const qualityRoles = ["quality", "quality_manager"];
const verificationRoles = ["test_engineer", "verification_engineer", "ae_manager"];

export class PrismaSupplyQualityRepository implements SupplyQualityRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async workbench(subjectId: string, systemAdministrator: boolean): Promise<InternalWorkbenchView> {
    const roleRows = await this.prisma.subjectRole.findMany({ where: { subjectId }, include: { role: true } });
    const roles = roleRows.map((item) => item.role.code);
    const has = (allowed: readonly string[]) => systemAdministrator || roles.some((role) => allowed.includes(role));
    const [supportTickets, sampleRequests, rfqRequests, qualityEvents, verificationTasks] = await Promise.all([
      has(faeRoles)
        ? this.prisma.supportTicket.findMany({
            where: systemAdministrator ? {} : { OR: [{ assignedToId: subjectId }, { assignedToId: null }] },
            orderBy: [{ slaDueAt: "asc" }, { createdAt: "asc" }],
            take: 100
          })
        : [],
      has(sampleRoles)
        ? this.prisma.sampleRequest.findMany({ include: { project: true, orderableSku: true }, orderBy: { createdAt: "asc" }, take: 100 })
        : [],
      has(rfqRoles)
        ? this.prisma.rfqRequest.findMany({ include: { project: true, orderableSku: true }, orderBy: { createdAt: "asc" }, take: 100 })
        : [],
      has(qualityRoles)
        ? this.prisma.qualityEvent.findMany({ orderBy: [{ severity: "desc" }, { createdAt: "asc" }], take: 100 })
        : [],
      has(verificationRoles)
        ? this.prisma.verificationTask.findMany({ orderBy: { createdAt: "asc" }, take: 100 })
        : []
    ]);
    return {
      roles,
      supportTickets: supportTickets.map((ticket) => ({
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        status: ticket.status,
        assignedToId: ticket.assignedToId,
        slaDueAt: ticket.slaDueAt
      })),
      sampleRequests: sampleRequests.map((request) => ({
        id: request.id,
        projectCode: request.project.projectCode,
        orderCode: request.orderableSku.orderCode,
        quantity: request.quantity,
        status: request.status
      })),
      rfqRequests: rfqRequests.map((request) => ({
        id: request.id,
        projectCode: request.project.projectCode,
        orderCode: request.orderableSku.orderCode,
        quantity: request.quantity.toString(),
        status: request.status
      })),
      qualityEvents: qualityEvents.map((event) => ({
        eventCode: event.eventCode,
        severity: event.severity,
        status: event.status,
        description: event.description
      })),
      verificationTasks: verificationTasks.map((task) => ({
        taskCode: task.taskCode,
        status: task.status,
        source: task.source
      }))
    };
  }

  public async assignSupportTicket(ticketCode: string, subjectId: string, systemAdministrator: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      if (!systemAdministrator) {
        const eligible = await transaction.subjectRole.findFirst({
          where: { subjectId, role: { code: { in: faeRoles } } }
        });
        if (eligible === null) return null;
      }
      const ticket = await transaction.supportTicket.findUnique({ where: { ticketCode } });
      if (ticket === null || (ticket.assignedToId !== null && ticket.assignedToId !== subjectId)) return null;
      return transaction.supportTicket.update({
        where: { ticketCode },
        data: { assignedToId: subjectId, status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status },
        select: { ticketCode: true, status: true, assignedToId: true }
      });
    });
  }

  public async resolveSupportTicket(input: { readonly ticketCode: string; readonly subjectId: string; readonly systemAdministrator: boolean; readonly conclusion: unknown; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.findUnique({ where: { ticketCode: input.ticketCode } });
      if (ticket === null || (!input.systemAdministrator && ticket.assignedToId !== input.subjectId)) return null;
      const updated = await transaction.supportTicket.update({
        where: { ticketCode: input.ticketCode },
        data: { status: "RESOLVED", conclusion: input.conclusion as Prisma.InputJsonValue },
        select: { id: true, ticketCode: true, status: true }
      });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "support.resolve",
          targetType: "SupportTicket",
          targetId: updated.id,
          afterValue: { ticketCode: updated.ticketCode, status: updated.status, conclusion: input.conclusion as Prisma.InputJsonValue },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: input.systemAdministrator ? "SYSTEM_ADMIN" : "ASSIGNED_FAE"
        }
      });
      return { ticketCode: updated.ticketCode, status: updated.status };
    });
  }
}
