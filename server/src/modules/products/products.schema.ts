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

export function invalidateProductParamsSchemaCache(): void {
  cache.delete('product_params');
}

function readValidation(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function readOptionValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      if (typeof option === 'string') return option;
      if (typeof option === 'object' && option !== null && 'value' in option) {
        return String(option.value);
      }
      return null;
    })
    .filter((option): option is string => option !== null);
}

function fieldConfigToZod(config: {
  fieldType: string;
  required: boolean;
  optionsJson: unknown;
  validationJson: unknown;
}): z.ZodTypeAny {
  const validation = readValidation(config.validationJson);
  switch (config.fieldType) {
    case 'text': {
      let schema = config.required ? z.string().trim().min(1) : z.string();
      if (typeof validation.minLength === 'number') schema = schema.min(validation.minLength);
      if (typeof validation.maxLength === 'number') schema = schema.max(validation.maxLength);
      if (typeof validation.pattern === 'string' && validation.pattern) {
        try {
          schema = schema.regex(new RegExp(validation.pattern));
        } catch {
          // Invalid legacy patterns are ignored until the field is saved again.
        }
      }
      return schema;
    }
    case 'number': {
      let schema = z.number();
      if (typeof validation.min === 'number') schema = schema.min(validation.min);
      if (typeof validation.max === 'number') schema = schema.max(validation.max);
      return schema;
    }
    case 'single_select': {
      const options = readOptionValues(config.optionsJson);
      return z.string().refine((value) => options.includes(value), 'Invalid field option');
    }
    case 'multi_select': {
      const options = readOptionValues(config.optionsJson);
      const schema = config.required ? z.array(z.string()).min(1) : z.array(z.string());
      return schema.refine(
        (values) => values.every((value) => options.includes(value)),
        'Invalid field option',
      );
    }
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
    const base = fieldConfigToZod(cfg);
    shape[cfg.fieldKey] = cfg.required ? base : base.optional();
    optionalShape[cfg.fieldKey] = base.optional();
  }

  return {
    schema: z.object(shape).strict(),
    optionalSchema: z.object(optionalShape).strict(),
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
  datasheetMaterialId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  status: z.ZodDefault<z.ZodOptional<z.ZodEnum<['DRAFT', 'ACTIVE', 'INACTIVE']>>>;
}>> {
  const { schema } = await getCachedSchemas();
  return z.object({
    model: z.string().min(1),
    series: z.string().min(1),
    params: schema,
    advantages: z.array(z.string()),
    datasheetMaterialId: z.string().nullable().optional(),
    status: productStatusEnum.optional().default('DRAFT'),
  });
}

export async function getUpdateProductSchema(): Promise<z.ZodObject<{
  model: z.ZodOptional<z.ZodString>;
  series: z.ZodOptional<z.ZodString>;
  params: z.ZodOptional<z.ZodObject<Record<string, z.ZodTypeAny>>>;
  advantages: z.ZodOptional<z.ZodArray<z.ZodString>>;
  datasheetMaterialId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  status: z.ZodOptional<z.ZodEnum<['DRAFT', 'ACTIVE', 'INACTIVE']>>;
}>> {
  const { optionalSchema } = await getCachedSchemas();
  return z.object({
    model: z.string().min(1).optional(),
    series: z.string().min(1).optional(),
    params: optionalSchema.optional(),
    advantages: z.array(z.string()).optional(),
    datasheetMaterialId: z.string().nullable().optional(),
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
