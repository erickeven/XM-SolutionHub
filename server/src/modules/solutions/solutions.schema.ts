import { z } from 'zod';

const solutionStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

export const createSolutionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  productIds: z.array(z.string()).optional(),
  status: solutionStatusEnum.optional().default('DRAFT'),
});

export const updateSolutionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  status: solutionStatusEnum.optional(),
});

export const solutionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: solutionStatusEnum.optional(),
});

export type CreateSolutionInput = z.infer<typeof createSolutionSchema>;
export type UpdateSolutionInput = z.infer<typeof updateSolutionSchema>;
export type SolutionQueryInput = z.infer<typeof solutionQuerySchema>;