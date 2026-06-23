import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import type { Lead, LeadEvent } from '@prisma/client';
import type { LeadListQuery, LeadStatus } from './leads.types';

export async function findLeadByUserId(userId: string): Promise<Lead | null> {
  return prisma.lead.findFirst({ where: { userId } });
}

export async function findLeadByAnonymousId(anonymousId: string): Promise<Lead | null> {
  return prisma.lead.findFirst({ where: { anonymousId } });
}

export async function createLead(data: {
  userId?: string;
  anonymousId?: string;
}): Promise<Lead> {
  return prisma.lead.create({
    data: {
      userId: data.userId,
      anonymousId: data.anonymousId,
      status: 'NEW',
    },
  });
}

export async function updateLeadScore(leadId: string, scoreAdd: number): Promise<Lead> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }
  return prisma.lead.update({
    where: { id: leadId },
    data: { score: lead.score + scoreAdd },
  });
}

export async function updateLeadLastActive(leadId: string): Promise<Lead> {
  return prisma.lead.update({
    where: { id: leadId },
    data: { lastActiveAt: new Date() },
  });
}

export async function createLeadEvent(
  leadId: string,
  eventType: string,
  payload: unknown,
): Promise<LeadEvent> {
  return prisma.leadEvent.create({
    data: {
      leadId,
      eventType,
      payload: payload as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function mergeAnonymousToUser(leadId: string, userId: string): Promise<Lead> {
  return prisma.lead.update({
    where: { id: leadId },
    data: { userId, anonymousId: null },
  });
}

// ── Lead management repository functions (PRD §7.5) ─────────

export async function listLeads(
  query: LeadListQuery,
): Promise<{ items: Lead[]; total: number }> {
  const {
    page,
    pageSize,
    status,
    assignedTo,
    scoreMin,
    scoreMax,
    startDate,
    endDate,
    search,
  } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.LeadWhereInput = {};
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;
  if (scoreMin !== undefined || scoreMax !== undefined) {
    where.score = {};
    if (scoreMin !== undefined) where.score.gte = scoreMin;
    if (scoreMax !== undefined) where.score.lte = scoreMax;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }
  if (search) {
    where.OR = [
      { userId: { contains: search, mode: 'insensitive' } },
      { anonymousId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { lastActiveAt: 'desc' },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total };
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<Lead> {
  return prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });
}

export async function assignLead(
  leadId: string,
  staffId: string,
): Promise<Lead> {
  return prisma.lead.update({
    where: { id: leadId },
    data: { assignedTo: staffId, status: 'ASSIGNED' },
  });
}

export async function getLeadEvents(leadId: string): Promise<LeadEvent[]> {
  return prisma.leadEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
  });
}