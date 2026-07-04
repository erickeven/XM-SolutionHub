import { z } from 'zod';

export const chatSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query too long'),
  sessionId: z.string().min(1).nullish(),
});

export const feedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(1000).optional(),
});

export type ChatSchemaInput = z.infer<typeof chatSchema>;
export type FeedbackSchemaInput = z.infer<typeof feedbackSchema>;