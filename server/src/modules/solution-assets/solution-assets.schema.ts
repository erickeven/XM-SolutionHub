import { z } from "zod";

export const solutionSearchSchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const solutionCodeSchema = z.object({
  solutionCode: z.string().trim().min(1).max(80)
});
