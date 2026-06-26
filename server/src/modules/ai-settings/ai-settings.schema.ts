import { z } from 'zod';

export const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().max(500).nullable().optional(),
  /** Plaintext API key — encrypted to apiKeyEncrypted before storage */
  apiKeyPlaintext: z.string().max(2000).optional(),
  model: z.string().max(100).nullable().optional(),
  dimensions: z.number().int().positive().nullable().optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const testConnectionSchema = z.object({
  providerId: z.string().optional(),
  providerType: z.enum(['llm', 'embedding', 'rerank']).optional(),
  baseUrl: z.string().max(500).optional(),
  apiKey: z.string().max(2000).optional(),
  model: z.string().max(100).optional(),
});

export const updatePromptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateProviderBody = z.infer<typeof updateProviderSchema>;
export type TestConnectionBody = z.infer<typeof testConnectionSchema>;
export type UpdatePromptBody = z.infer<typeof updatePromptSchema>;