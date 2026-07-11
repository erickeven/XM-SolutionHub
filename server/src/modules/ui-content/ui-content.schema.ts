import { z } from 'zod';

export const createUiContentSchema = z.object({
  key: z.string().min(1).max(160).regex(/^[a-z][A-Za-z0-9_.-]*$/),
  group: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  value: z.string().max(5000),
  enabled: z.boolean().optional(),
});

export const updateUiContentSchema = z.object({
  group: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(200).optional(),
  value: z.string().max(5000).optional(),
  enabled: z.boolean().optional(),
});
