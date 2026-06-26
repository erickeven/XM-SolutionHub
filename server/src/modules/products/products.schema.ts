import { z } from 'zod';
import { findAll } from './field-config.repository';

// ── Static fields ──

const productStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

// ── Dynamic params schema cache (60s TTL) ──

interface SchemaCacheEntry {
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  optionalSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  expiresAt: number;
}

const cache = new Map<string, SchemaCacheEntry>();
const CACHE_TTL_MS = 60_000;

function fieldTypeToZod(fieldType: string): z.ZodTypeAny {
  switch (fieldType) {
    case 'text':
      return z.string();
    case 'number':
      return z.number();
    case 'single_select':
      return z.string();
    case 'multi_select':
      return z.array(z.string());
    case 'boolean':
      return z.boolean();
    default:
      return z.unknown();
  }
}

async function buildParamsSchemas(): Promise<{
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  optionalSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}> {
  const configs = await findAll(true);
  const FIXED_FIELDS = new Set(['model', 'series', 'status', 'advantages']);

  const shape: Record<string, z.ZodTypeAny> = {};
  const optionalShape: Record<string, z.ZodTypeAny> = {};

  for (const cfg of configs) {
    if (FIXED_FIELDS.has(cfg.fieldKey)) continue;
    const base = fieldTypeToZod(cfg.fieldType);
    shape[cfg.fieldKey] = cfg.required ? base : base.optional();
    optionalShape[cfg.fieldKey] = base.optional();
  }

  return {
    schema: z.object(shape),
    optionalSchema: z.object(optionalShape),
  };
}

async function getCachedSchemas(): Promise<{
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  optionalSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}> {
  const now = Date.now();
  const cached = cache.get('product_params');
  if (cached && cached.expiresAt > now) {
    return { schema: cached.schema, optionalSchema: cached.optionalSchema };
  }

  const built = await buildParamsSchemas();
  cache.set('product_params', { ...built, expiresAt: now + CACHE_TTL_MS });
  return built;
}

// ── Async schema factories ──

export async function getCreateProductSchema(): Promise<z.ZodObject<{
  model: z.ZodString;
  series: z.ZodString;
  params: z.ZodObject<Record<string, z.ZodTypeAny>>;
  advantages: z.ZodArray<z.ZodString>;
  status: z.ZodDefault<z.ZodOptional<z.ZodEnum<['DRAFT', 'ACTIVE', 'INACTIVE']>>>;
}>> {
  const { schema } = await getCachedSchemas();
  return z.object({
    model: z.string().min(1),
    series: z.string().min(1),
    params: schema,
    advantages: z.array(z.string()),
    status: productStatusEnum.optional().default('DRAFT'),
  });
}

export async function getUpdateProductSchema(): Promise<z.ZodObject<{
  model: z.ZodOptional<z.ZodString>;
  series: z.ZodOptional<z.ZodString>;
  params: z.ZodOptional<z.ZodObject<Record<string, z.ZodTypeAny>>>;
  advantages: z.ZodOptional<z.ZodArray<z.ZodString>>;
  status: z.ZodOptional<z.ZodEnum<['DRAFT', 'ACTIVE', 'INACTIVE']>>;
}>> {
  const { optionalSchema } = await getCachedSchemas();
  return z.object({
    model: z.string().min(1).optional(),
    series: z.string().min(1).optional(),
    params: optionalSchema.optional(),
    advantages: z.array(z.string()).optional(),
    status: productStatusEnum.optional(),
  });
}

// ── Query schema (static, no changes) ──

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: productStatusEnum.optional(),
});

// ── Inferred types ──

export type CreateProductInput = z.infer<Awaited<ReturnType<typeof getCreateProductSchema>>>;
export type UpdateProductInput = z.infer<Awaited<ReturnType<typeof getUpdateProductSchema>>>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;