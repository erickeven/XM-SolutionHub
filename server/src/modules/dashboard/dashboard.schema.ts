import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  // no query params required — endpoint is a snapshot
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
