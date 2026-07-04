import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import prisma from '../lib/prisma';

// ponytail: simple in-memory cache with TTL, add Redis if this becomes a bottleneck
const cache = new Map<string, { expires: number; permissions: Set<string> }>();
const CACHE_TTL_MS = 60_000;

function getCacheKey(userId: string): string {
  return `perm:${userId}`;
}

async function fetchUserPermissions(userId: string): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const perms = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      perms.add(rp.permission.code);
    }
  }

  cache.set(getCacheKey(userId), {
    expires: Date.now() + CACHE_TTL_MS,
    permissions: perms,
  });

  return perms;
}

const ALL_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'admin.dashboard.read',
    'products.read', 'products.write',
    'solutions.read', 'solutions.write',
    'materials.read', 'materials.write',
    'knowledge.read', 'knowledge.write',
    'users.read', 'users.write',
    'audit.read',
    'leads.read', 'leads.write',
    'settings.ai.read', 'settings.ai.write',
  ],
  AUDITOR: [
    'admin.dashboard.read',
    'products.read',
    'solutions.read',
    'materials.read',
    'knowledge.read',
    'audit.read',
    'leads.read',
  ],
  STAFF: [
    'admin.dashboard.read',
    'products.read',
    'solutions.read',
    'materials.read',
    'knowledge.read',
    'leads.read',
    'leads.write',
  ],
};

export function permissionGuard(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError(2001, 'Authentication required', 401);
      }

      let userPerms: Set<string>;

      const cached = cache.get(getCacheKey(req.user.userId));
      if (cached && cached.expires > Date.now()) {
        userPerms = cached.permissions;
      } else {
        // DB-first: query UserRole records for every user. If the user has
        // custom roles assigned, those permissions take priority. Fall back
        // to the hardcoded ALL_PERMISSIONS map only when DB returns empty
        // (no UserRole records for legacy users) or throws an error.
        try {
          const dbPerms = await fetchUserPermissions(req.user.userId);
          if (dbPerms.size > 0) {
            userPerms = dbPerms;
          } else {
            // Legacy user with no UserRole records — fall back to role-based map
            userPerms = new Set(ALL_PERMISSIONS[req.user.role]);
          }
        } catch {
          // DB query failed — fall back to role-based map
          userPerms = new Set(ALL_PERMISSIONS[req.user.role]);
        }

        // Still cache even the fallback result to avoid repeated DB failures
        if (!cached || cached.expires <= Date.now()) {
          cache.set(getCacheKey(req.user.userId), {
            expires: Date.now() + CACHE_TTL_MS,
            permissions: userPerms,
          });
        }
      }

      const missing = requiredPermissions.filter((p) => !userPerms.has(p));
      if (missing.length > 0) {
        throw new AppError(2003, `Insufficient permissions. Missing: ${missing.join(', ')}`, 403);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
