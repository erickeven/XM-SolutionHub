import { z } from 'zod';

export const eventSchema = z.object({
  eventType: z.enum([
    'selection',
    'product_view',
    'material_preview',
    'material_download',
    'ai_question',
    'ai_feedback',
    'register',
  ]),
  anonymousId: z.string().min(1).optional(),
  page: z.string().max(500).optional(),
  payload: z.record(z.unknown()).optional(),
});

export type EventSchemaInput = z.infer<typeof eventSchema>;

// ── Lead admin schemas (PRD §9 L319-322) ───────────────────

const leadStatusEnum = z.enum(['NEW', 'ASSIGNED', 'FOLLOWING', 'CONVERTED', 'ABANDONED']);

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: leadStatusEnum.optional(),
  assignedTo: z.string().min(1).optional(),
  scoreMin: z.coerce.number().int().min(0).optional(),
  scoreMax: z.coerce.number().int().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().min(1).max(200).optional(),
});

export type LeadListQueryInput = z.infer<typeof leadListQuerySchema>;

export const assignLeadSchema = z.object({
  staffId: z.string().min(1),
});

export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

export const updateLeadStatusSchema = z.object({
  status: leadStatusEnum,
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const leadExportSchema = z.object({
  status: leadStatusEnum.optional(),
  assignedTo: z.string().min(1).optional(),
  scoreMin: z.coerce.number().int().min(0).optional(),
  scoreMax: z.coerce.number().int().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().min(1).max(200).optional(),
});

export type LeadExportInput = z.infer<typeof leadExportSchema>;