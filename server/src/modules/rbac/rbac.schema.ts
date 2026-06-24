import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(1).max(200),
  permissionIds: z.array(z.string()),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().min(1).max(200).optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;
