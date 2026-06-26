import { z } from 'zod';

const materialStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);
const materialTypeEnum = z.enum([
  'datasheet',
  'demo_report',
  'application_note',
  'other',
]);

export const createMaterialSchema = z.object({
  type: materialTypeEnum,
  title: z.string().min(1),
  solutionId: z.string().optional(),
  productId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const materialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: materialStatusEnum.optional(),
  type: materialTypeEnum.optional(),
  solutionId: z.string().optional(),
});

export const updateMaterialSchema = z.object({
  title: z.string().min(1).optional(),
  type: materialTypeEnum.optional(),
  solutionId: z.string().optional(),
  productId: z.string().optional(),
  status: materialStatusEnum.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type MaterialQueryInput = z.infer<typeof materialQuerySchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
