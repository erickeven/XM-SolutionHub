import prisma from '../../lib/prisma';
import * as repo from './events.repository';
import type { ProcessEventResult } from './leads.types';

const SCORE_WEIGHTS: Record<string, number> = {
  material_download: 20,
  register: 15,
  ai_question: 10,
  ai_feedback: 5,
  material_preview: 5,
  selection: 3,
  product_view: 2,
};

export async function processEvent(
  input: {
    eventType: string;
    anonymousId?: string;
    page?: string;
    payload?: Record<string, unknown>;
  },
  userId?: string,
): Promise<ProcessEventResult> {
  // Determine identity: JWT userId takes priority, fall back to anonymousId
  let lead: Awaited<ReturnType<typeof repo.findLeadByUserId>>;

  if (userId) {
    lead = await repo.findLeadByUserId(userId);
    if (!lead) {
      lead = await repo.createLead({ userId });
    }
  } else {
    const anonymousId = input.anonymousId!;
    lead = await repo.findLeadByAnonymousId(anonymousId);
    if (!lead) {
      lead = await repo.createLead({ anonymousId });
    }
  }

  // Build event payload (include page if provided)
  const eventPayload: Record<string, unknown> = {};
  if (input.page) {
    eventPayload.page = input.page;
  }
  if (input.payload) {
    Object.assign(eventPayload, input.payload);
  }

  // Create LeadEvent
  const event = await repo.createLeadEvent(
    lead.id,
    input.eventType,
    Object.keys(eventPayload).length > 0 ? eventPayload : null,
  );

  // Update score (cumulative, never overwrite)
  const scoreAdd = SCORE_WEIGHTS[input.eventType] ?? 0;
  if (scoreAdd > 0) {
    await repo.updateLeadScore(lead.id, scoreAdd);
  }

  // Update lastActiveAt
  await repo.updateLeadLastActive(lead.id);

  return { leadId: lead.id, eventId: event.id };
}

export async function mergeAnonymousLeadToUser(
  anonymousId: string,
  userId: string,
): Promise<void> {
  const existing = await repo.findLeadByAnonymousId(anonymousId);
  if (!existing) {
    return;
  }

  // Check if user already has a lead — if so, keep the user lead and delete the anonymous one
  const userLead = await repo.findLeadByUserId(userId);
  if (userLead) {
    // Migrate events from anonymous lead to user lead, then delete anonymous lead
    await prisma.leadEvent.updateMany({
      where: { leadId: existing.id },
      data: { leadId: userLead.id },
    });
    // Merge scores
    await prisma.lead.update({
      where: { id: userLead.id },
      data: { score: userLead.score + existing.score },
    });
    await prisma.lead.delete({ where: { id: existing.id } });
  } else {
    await repo.mergeAnonymousToUser(existing.id, userId);
  }
}