import type { PrismaClient } from "../../generated/prisma/client.js";
import type { CustomerWorkspaceView, ProjectSupportRepository } from "./project-support.repository.js";

export class PrismaProjectSupportRepository implements ProjectSupportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async workspace(subjectId: string): Promise<CustomerWorkspaceView> {
    const [organizations, projects, tickets, sampleRequests, rfqRequests] = await Promise.all([
      this.prisma.customerOrganizationMember.findMany({
        where: { subjectId, status: "ACTIVE" },
        include: { organization: true },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.projectMember.findMany({
        where: { subjectId, status: "ACTIVE" },
        include: { project: true },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.supportTicket.findMany({
        where: { createdById: subjectId },
        orderBy: { updatedAt: "desc" },
        take: 50
      }),
      this.prisma.sampleRequest.findMany({
        where: { project: { members: { some: { subjectId, status: "ACTIVE" } } } },
        include: { project: true, orderableSku: true },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.prisma.rfqRequest.findMany({
        where: { project: { members: { some: { subjectId, status: "ACTIVE" } } } },
        include: { project: true, orderableSku: true },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);
    return {
      organizations: organizations.map((membership) => ({
        id: membership.organization.id,
        orgCode: membership.organization.orgCode,
        name: membership.organization.name,
        customerRole: membership.customerRole
      })),
      projects: projects.map((membership) => ({
        id: membership.project.id,
        projectCode: membership.project.projectCode,
        name: membership.project.name,
        stage: membership.project.stage,
        projectRole: membership.projectRole
      })),
      tickets: tickets.map((ticket) => ({
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        status: ticket.status,
        updatedAt: ticket.updatedAt
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
      }))
    };
  }

  public createOrganization(input: { readonly orgCode: string; readonly name: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.customerOrganization.create({
        data: {
          orgCode: input.orgCode,
          name: input.name,
          members: {
            create: { subjectId: input.subjectId, customerRole: "CUSTOMER_MANAGER", status: "ACTIVE", joinedAt: new Date() }
          }
        }
      });
      await transaction.customerProfile.update({ where: { subjectId: input.subjectId }, data: { level: "L2_ORGANIZATION" } });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "organization.create",
          targetType: "CustomerOrganization",
          targetId: organization.id,
          afterValue: { orgCode: organization.orgCode, name: organization.name },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: "CUSTOMER_SELF_SERVICE"
        }
      });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: "CustomerOrganization",
          aggregateId: organization.id,
          eventType: "customer.organization.created",
          payload: { organizationId: organization.id },
          idempotencyKey: `customer.organization.created:${organization.id}`
        }
      });
      return { id: organization.id, orgCode: organization.orgCode, name: organization.name };
    });
  }

  public createProject(input: { readonly organizationId: string; readonly projectCode: string; readonly name: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const manager = await transaction.customerOrganizationMember.findFirst({
        where: { organizationId: input.organizationId, subjectId: input.subjectId, status: "ACTIVE", customerRole: "CUSTOMER_MANAGER" }
      });
      if (manager === null) return null;
      const project = await transaction.project.create({
        data: {
          organizationId: input.organizationId,
          projectCode: input.projectCode,
          name: input.name,
          customerConfirmedAt: new Date(),
          members: { create: { subjectId: input.subjectId, projectRole: "PROJECT_OWNER", status: "ACTIVE" } }
        }
      });
      await transaction.customerProfile.update({ where: { subjectId: input.subjectId }, data: { level: "L3_PROJECT" } });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "project.create",
          targetType: "Project",
          targetId: project.id,
          afterValue: { projectCode: project.projectCode, name: project.name, stage: project.stage },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: "ORGANIZATION_MANAGER"
        }
      });
      return { id: project.id, projectCode: project.projectCode, name: project.name, stage: project.stage };
    });
  }

  public createTicket(input: { readonly ticketCode: string; readonly projectId: string | null; readonly title: string; readonly description: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      if (input.projectId !== null) {
        const member = await transaction.projectMember.findFirst({
          where: { projectId: input.projectId, subjectId: input.subjectId, status: "ACTIVE" }
        });
        if (member === null) return null;
      }
      const ticket = await transaction.supportTicket.create({
        data: {
          ticketCode: input.ticketCode,
          projectId: input.projectId,
          createdById: input.subjectId,
          title: input.title,
          description: input.description,
          slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "support.create",
          targetType: "SupportTicket",
          targetId: ticket.id,
          afterValue: { ticketCode: ticket.ticketCode, status: ticket.status },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: input.projectId === null ? "REGISTERED_CUSTOMER" : "PROJECT_MEMBER"
        }
      });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: "SupportTicket",
          aggregateId: ticket.id,
          eventType: "support.ticket.created",
          payload: { ticketCode: ticket.ticketCode },
          idempotencyKey: `support.ticket.created:${ticket.id}`
        }
      });
      return { ticketCode: ticket.ticketCode, status: ticket.status };
    });
  }

  public createSampleRequest(input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const [member, sku] = await Promise.all([
        transaction.projectMember.findFirst({ where: { projectId: input.projectId, subjectId: input.subjectId, status: "ACTIVE" } }),
        transaction.orderableSku.findFirst({ where: { orderCode: input.orderCode, status: "PUBLISHED", product: { status: "PUBLISHED" } } })
      ]);
      if (member === null || sku === null) return null;
      const request = await transaction.sampleRequest.create({
        data: { projectId: input.projectId, orderableSkuId: sku.id, quantity: input.quantity, source: "CUSTOMER_PROJECT_REQUEST" }
      });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "sample.create",
          targetType: "SampleRequest",
          targetId: request.id,
          afterValue: { orderCode: input.orderCode, quantity: input.quantity, status: request.status },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: "PROJECT_MEMBER"
        }
      });
      return { id: request.id, status: request.status };
    });
  }

  public createRfqRequest(input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const [member, sku] = await Promise.all([
        transaction.projectMember.findFirst({ where: { projectId: input.projectId, subjectId: input.subjectId, status: "ACTIVE" } }),
        transaction.orderableSku.findFirst({ where: { orderCode: input.orderCode, status: "PUBLISHED", product: { status: "PUBLISHED" } } })
      ]);
      if (member === null || sku === null) return null;
      const request = await transaction.rfqRequest.create({
        data: { projectId: input.projectId, orderableSkuId: sku.id, quantity: input.quantity }
      });
      await transaction.auditEvent.create({
        data: {
          actorId: input.subjectId,
          action: "rfq.create",
          targetType: "RfqRequest",
          targetId: request.id,
          afterValue: { orderCode: input.orderCode, quantity: input.quantity, status: request.status },
          sourceIp: input.sourceIp,
          traceId: input.traceId,
          authorizationResult: "PROJECT_MEMBER"
        }
      });
      return { id: request.id, status: request.status };
    });
  }
}
