import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../lib/response';
import { AppError } from '../../lib/errors';
import prisma from '../../lib/prisma';
import {
  leadListQuerySchema,
  assignLeadSchema,
  updateLeadStatusSchema,
  leadExportSchema,
} from './leads.schema';
import {
  aggregateLeads,
  assignLeadToStaff,
  changeLeadStatus,
  getLeadDetail,
  getLeadsExport,
} from './leads.service';
import type { LeadListQuery, LeadAggregated } from './leads.types';

// ── dataScope helpers ──────────────────────────────────────

function requireAuth(req: Request): { userId: string; role: string } {
  if (!req.user) {
    throw new AppError(2001, 'Authentication required', 401);
  }
  return { userId: req.user.userId, role: req.user.role };
}

// USER role is never allowed to access lead admin endpoints
function rejectUserRole(role: string): void {
  if (role === 'USER') {
    throw new AppError(2003, 'Insufficient permissions', 403);
  }
}

// STAFF can only see leads assigned to themselves; AUDITOR+ see all
function applyDataScope(
  query: Partial<LeadListQuery>,
  role: string,
  userId: string,
): LeadListQuery {
  if (role === 'STAFF') {
    return { ...query, assignedTo: userId } as LeadListQuery;
  }
  return query as LeadListQuery;
}

// ── CSV helper ─────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatLeadsAsCsv(items: LeadAggregated[]): string {
  const header =
    'id,userId,anonymousId,score,status,assignedTo,lastActiveAt,createdAt,updatedAt,events';
  const rows = items.map((item) => {
    return [
      csvEscape(item.id),
      csvEscape(item.userId ?? ''),
      csvEscape(item.anonymousId ?? ''),
      csvEscape(String(item.score)),
      csvEscape(item.status),
      csvEscape(item.assignedTo ?? ''),
      csvEscape(item.lastActiveAt.toISOString()),
      csvEscape(item.createdAt.toISOString()),
      csvEscape(item.updatedAt.toISOString()),
      csvEscape(JSON.stringify(item.events)),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

// ── Handlers ───────────────────────────────────────────────

export async function listLeadsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, role } = requireAuth(req);
    rejectUserRole(role);

    const parsed = leadListQuerySchema.parse(req.query);
    const query = applyDataScope(parsed, role, userId);

    const result = await aggregateLeads(query);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

export async function getLeadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, role } = requireAuth(req);
    rejectUserRole(role);

    const leadId = req.params.id;
    if (!leadId) {
      throw new AppError(1002, 'Missing lead id', 400);
    }

    // dataScope: STAFF can only read leads assigned to themselves
    if (role === 'STAFF') {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        throw new AppError(3001, 'Lead not found', 404);
      }
      if (lead.assignedTo !== userId) {
        throw new AppError(2003, 'Cannot view lead not assigned to you', 403);
      }
    }

    const detail = await getLeadDetail(leadId);
    res.status(200).json(successResponse(detail));
  } catch (err) {
    next(err);
  }
}

export async function assignLeadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId: actorId } = requireAuth(req);
    const leadId = req.params.id;
    if (!leadId) {
      throw new AppError(1002, 'Missing lead id', 400);
    }

    const { staffId } = assignLeadSchema.parse(req.body);

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new AppError(3001, 'Lead not found', 404);
    }

    const updated = await assignLeadToStaff(leadId, staffId, actorId);
    res.status(200).json(
      successResponse({ leadId: updated.id, assignedTo: updated.assignedTo }),
    );
  } catch (err) {
    next(err);
  }
}

export async function updateLeadStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, role } = requireAuth(req);
    rejectUserRole(role);

    const leadId = req.params.id;
    if (!leadId) {
      throw new AppError(1002, 'Missing lead id', 400);
    }

    const { status } = updateLeadStatusSchema.parse(req.body);

    // dataScope: STAFF can only update leads assigned to themselves
    if (role === 'STAFF') {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        throw new AppError(3001, 'Lead not found', 404);
      }
      if (lead.assignedTo !== userId) {
        throw new AppError(2003, 'Cannot update lead not assigned to you', 403);
      }
    }

    const updated = await changeLeadStatus(leadId, status, userId);
    res.status(200).json(
      successResponse({ leadId: updated.id, status: updated.status }),
    );
  } catch (err) {
    next(err);
  }
}

export async function exportLeadsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, role } = requireAuth(req);
    rejectUserRole(role);

    const parsed = leadExportSchema.parse(req.body);
    const query = applyDataScope(parsed, role, userId);

    const items = await getLeadsExport(query);
    const csv = formatLeadsAsCsv(items);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${date}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}