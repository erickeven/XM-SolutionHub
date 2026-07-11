import { describe, expect, it } from 'vitest';
import {
  createFieldConfigSchema as createProductFieldSchema,
  updateFieldConfigSchema as updateProductFieldSchema,
} from '../products/field-config.schema';
import {
  createFieldConfigSchema as createMaterialFieldSchema,
  updateFieldConfigSchema as updateMaterialFieldSchema,
} from '../materials/field-config.schema';

const schemas = [
  ['product', createProductFieldSchema, updateProductFieldSchema],
  ['material', createMaterialFieldSchema, updateMaterialFieldSchema],
] as const;

describe.each(schemas)('%s field configuration', (_resource, createSchema, updateSchema) => {
  it.each(['text', 'number', 'boolean'] as const)(
    'accepts %s fields without select options',
    (fieldType) => {
      expect(() =>
        createSchema.parse({
          fieldKey: `test_${fieldType}`,
          label: fieldType,
          fieldType,
          optionsJson: null,
        }),
      ).not.toThrow();

      expect(() => updateSchema.parse({ fieldType, optionsJson: null })).not.toThrow();
    },
  );

  it('still requires options for select fields', () => {
    expect(() =>
      createSchema.parse({
        fieldKey: 'test_select',
        label: 'Select',
        fieldType: 'single_select',
        optionsJson: null,
      }),
    ).toThrow();
  });

  it('rejects inconsistent validation rules', () => {
    expect(() =>
      createSchema.parse({
        fieldKey: 'invalid_range',
        label: 'Invalid range',
        fieldType: 'number',
        validationJson: { min: 10, max: 1 },
      }),
    ).toThrow();
    expect(() =>
      updateSchema.parse({ validationJson: { pattern: '[' } }),
    ).toThrow();
  });
});
