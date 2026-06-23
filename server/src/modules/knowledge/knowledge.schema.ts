import { z } from 'zod';

const knowledgeStatusEnum = z.enum(['UPLOADED', 'PROCESSING', 'READY', 'FAILED']);

export const createKnowledgeSchema = z.object({
  materialId: z.string().min(1, 'materialId is required'),
  title: z.string().min(1, 'title is required'),
  sourceType: z.string().min(1, 'sourceType is required'),
});

export const updateKnowledgeSchema = z.object({
  title: z.string().min(1).optional(),
  sourceType: z.string().min(1).optional(),
});

export const knowledgeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: knowledgeStatusEnum.optional(),
});

export type CreateKnowledgeSchemaInput = z.infer<typeof createKnowledgeSchema>;
export type UpdateKnowledgeSchemaInput = z.infer<typeof updateKnowledgeSchema>;
export type KnowledgeListQueryInput = z.infer<typeof knowledgeListQuerySchema>;