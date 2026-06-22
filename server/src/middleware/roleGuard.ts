import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

type Role = 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN';

const ROLE_LEVELS: Record<string, number> = {
  USER: 1,
  STAFF: 2,
  AUDITOR: 3,
  ADMIN: 4,
};

export function roleGuard(minRole: Role | Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(2001, 'Authentication required', 401);
    }

    const userRole = req.user.role;
    const allowed = Array.isArray(minRole)
      ? minRole.includes(userRole as Role)
      : (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[minRole] ?? 0);

    if (!allowed) {
      throw new AppError(2003, 'Insufficient permissions', 403);
    }

    next();
  };
}