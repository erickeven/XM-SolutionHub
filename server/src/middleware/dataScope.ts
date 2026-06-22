import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function dataScope() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(2001, 'Authentication required', 401);
    }

    const role = req.user.role;
    if (role === 'ADMIN' || role === 'AUDITOR') {
      res.locals.dataScope = 'all';
    } else if (role === 'STAFF') {
      res.locals.dataScope = 'assigned';
    } else {
      res.locals.dataScope = 'own';
    }

    next();
  };
}