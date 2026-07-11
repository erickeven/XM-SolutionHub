import { z } from 'zod';

export const fieldTypeEnum = z.enum([
  'text',
  'number',
  'single_select',
  'multi_select',
  'boolean',
]);

const fieldOptionsSchema = z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).nullable();

const validationSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    pattern: z.string().refine((value) => {
      try {
        new RegExp(value);
        return true;
      } catch {
        return false;
      }
    }, 'pattern must be a valid regular expression').optional(),
  })
  .refine((value) => value.min === undefined || value.max === undefined || value.min <= value.max, {
    message: 'min must be less than or equal to max',
  })
  .refine(
    (value) =>
      value.minLength === undefined ||
      value.maxLength === undefined ||
      value.minLength <= value.maxLength,
    { message: 'minLength must be less than or equal to maxLength' },
  )
  .nullable();

export const createFieldConfigSchema = z.object({
  resourceType: z.string().default('material'),
  fieldKey: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  fieldType: fieldTypeEnum,
  required: z.boolean().default(false),
  optionsJson: fieldOptionsSchema.optional(),
  sortOrder: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  validationJson: validationSchema.optional(),
}).refine(
  (data) => {
    if (data.fieldType === 'single_select' || data.fieldType === 'multi_select') {
      return Array.isArray(data.optionsJson) && data.optionsJson.length > 0;
    }
    return true;
  },
  {
    message: 'optionsJson is required and must be a non-empty array for single_select or multi_select field types',
    path: ['optionsJson'],
  },
);

export const updateFieldConfigSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  fieldType: fieldTypeEnum.optional(),
  required: z.boolean().optional(),
  optionsJson: fieldOptionsSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  validationJson: validationSchema.optional(),
}).refine(
  (data) => {
    if (data.fieldType && (data.fieldType === 'single_select' || data.fieldType === 'multi_select')) {
      return Array.isArray(data.optionsJson) && data.optionsJson.length > 0;
    }
    return true;
  },
  {
    message: 'optionsJson is required and must be a non-empty array for single_select or multi_select field types',
    path: ['optionsJson'],
  },
);

export const toggleFieldConfigSchema = z.object({
  enabled: z.boolean(),
});
