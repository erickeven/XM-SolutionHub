import { z } from 'zod';

export const fieldTypeEnum = z.enum([
  'text',
  'number',
  'single_select',
  'multi_select',
  'boolean',
]);

export const createFieldConfigSchema = z.object({
  resourceType: z.string().default('product'),
  fieldKey: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  fieldType: fieldTypeEnum,
  required: z.boolean().default(false),
  optionsJson: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
  sortOrder: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  validationJson: z.unknown().optional(),
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
  optionsJson: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
  sortOrder: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  validationJson: z.unknown().optional(),
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