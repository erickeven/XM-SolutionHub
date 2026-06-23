import { z } from 'zod';

const roleEnum = z.enum(['USER', 'STAFF', 'AUDITOR', 'ADMIN']);
const statusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: roleEnum,
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
