import type { Lead, LeadEvent } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import * as repo from './events.repository';
import { mergeAnonymousLeadToUser } from './events.service';
import { logFromContext } from '../audit/audit.service';
import type {
  LeadAggregated,
  LeadEventSummary,
  LeadListQuery,
  LeadListResult,
  LeadStatus,
} from './leads.types';

// One-way status transitions (PRD §7.5 L229-234)
const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['ASSIGNED', 'ABANDONED'],
  ASSIGNED: ['FOLLOWING', 'ABANDONED'],
  FOLLOWING: ['CONVERTED', 'ABANDONED'],
  CONVERTED: [],
  ABANDONED: [],
};

const ROLE_LEVELS: Record<string, number> = {
  USER: 1,
  STAFF: 2,
  AUDITOR: 3,
  ADMIN: 4,
};

const MIN_STAFF_LEVEL = 2;

function toLeadAggregated(lead: Lead, events: LeadEvent[]): LeadAggregated {
  const eventSummaries: LeadEventSummary[] = events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    payload: e.payload,
    createdAt: e.createdAt,
  }));

  return {
    id: lead.id,
    userId: lead.userId,
    anonymousId: lead.anonymousId,
    score: lead.score,
    status: lead.status as LeadStatus,
    assignedTo: lead.assignedTo,
    lastActiveAt: lead.lastActiveAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    events: eventSummaries,
  };
}

export async function aggregateLeads(
  query: LeadListQuery,
): Promise<LeadListResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const normalizedQuery: LeadListQuery = { ...query, page, pageSize };

  const { items, total } = await repo.listLeads(normalizedQuery);

  // Fetch events for each lead in parallel
  const itemsWithEvents = await Promise.all(
    items.map(async (lead) => {
      const events = await repo.getLeadEvents(lead.id);
      return toLeadAggregated(lead, events);
    }),
  );

  return {
    items: itemsWithEvents,
    total,
    page,
    pageSize,
  };
}

export async function getLeadDetail(leadId: string): Promise<LeadAggregated> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new AppError(3001, 'Lead not found', 404);
  }
  const events = await repo.getLeadEvents(leadId);
  return toLeadAggregated(lead, events);
}

export async function changeLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  actorId: string,
): Promise<Lead> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new AppError(3001, 'Lead not found', 404);
  }

  const currentStatus = lead.status as LeadStatus;
  const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      3002,
      `Invalid status transition: ${currentStatus} -> ${newStatus}`,
      400,
    );
  }

  const updated = await repo.updateLeadStatus(leadId, newStatus);

  logFromContext({
    actorId,
    action: 'lead.status_change',
    targetType: 'Lead',
    targetId: leadId,
    payload: { from: currentStatus, to: newStatus },
  });

  return updated;
}

export async function assignLeadToStaff(
  leadId: string,
  staffId: string,
  actorId: string,
): Promise<Lead> {
  // Verify assignee is STAFF or above
  const user = await prisma.user.findUnique({ where: { id: staffId } });
  if (!user) {
    throw new AppError(3003, 'Assigned user not found', 404);
  }

  const userRoleLevel = ROLE_LEVELS[user.role] ?? 0;
  if (userRoleLevel < MIN_STAFF_LEVEL) {
    throw new AppError(3004, 'Assignee must be STAFF or above', 400);
  }

  const updated = await repo.assignLead(leadId, staffId);

  logFromContext({
    actorId,
    action: 'lead.assign',
    targetType: 'Lead',
    targetId: leadId,
    payload: { assignedTo: staffId },
  });

  return updated;
}

export { mergeAnonymousLeadToUser };

export async function getLeadsExport(
  query: LeadListQuery,
): Promise<LeadAggregated[]> {
  // ponytail: large page size for export, add streaming if this becomes a bottleneck
  const exportQuery: LeadListQuery = {
    ...query,
    page: 1,
    pageSize: 100000,
  };
  const { items } = await aggregateLeads(exportQuery);
  return items;
}