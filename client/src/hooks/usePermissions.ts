import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Permission system hook.
 *
 * Reads permissions from auth store. If the permissions array is empty
 * (legacy user without the new /auth/me shape), falls back to a role-based
 * permission map so existing admin sessions keep working.
 */

const LEGACY_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'admin.dashboard.read',
    'products.read',
    'products.write',
    'solutions.read',
    'solutions.write',
    'materials.read',
    'materials.write',
    'knowledge.read',
    'knowledge.write',
    'users.read',
    'users.write',
    'audit.read',
    'leads.read',
    'leads.write',
  ],
  AUDITOR: [
    'admin.dashboard.read',
    'knowledge.read',
    'audit.read',
    'leads.read',
  ],
  STAFF: [
    'admin.dashboard.read',
    'leads.read',
    'leads.write',
  ],
  USER: [],
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const storePermissions = useAuthStore((s) => s.permissions);

  const permissions = useMemo<string[]>(() => {
    if (storePermissions.length > 0) return storePermissions;
    if (user?.permissions && user.permissions.length > 0) return user.permissions;
    // Backward compat: derive from legacy role
    const role = user?.role;
    return role ? LEGACY_ROLE_PERMISSIONS[role] ?? [] : [];
  }, [user, storePermissions]);

  const hasPermission = (code: string): boolean => permissions.includes(code);

  const hasAnyPermission = (codes: string[]): boolean =>
    codes.some((c) => permissions.includes(c));

  return { permissions, hasPermission, hasAnyPermission };
}
