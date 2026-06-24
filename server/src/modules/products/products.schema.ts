import { z } from 'zod';

const productStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

const productParamsSchema = z.object({
  inputVoltageMin: z.number(),
  inputVoltageMax: z.number(),
  outputVoltage: z.number(),
  outputCurrent: z.number(),
  applicationType: z.string().min(1),
  efficiencyLevel: z.string().optional(),
  standbyPowerMax: z.number().optional(),
  maxAmbientTemp: z.number().optional(),
  pcbaSize: z
    .object({ width: z.number(), height: z.number() })
    .optional(),
  certifications: z.array(z.string()).optional(),
  requiresPfc: z.boolean().optional(),
});

export const createProductSchema = z.object({
  model: z.string().min(1),
  series: z.string().min(1),
  params: productParamsSchema,
  advantages: z.array(z.string()),
  status: productStatusEnum.optional().default('DRAFT'),
});

export const updateProductSchema = z.object({
  model: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  params: productParamsSchema.optional(),
  advantages: z.array(z.string()).optional(),
  status: productStatusEnum.optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: productStatusEnum.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;