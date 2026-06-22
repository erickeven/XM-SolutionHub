import type { AuthUser } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user: AuthUser | null;
    }
    interface Response {
      locals: {
        dataScope: 'all' | 'assigned' | 'own';
      };
    }
  }
}

export {};