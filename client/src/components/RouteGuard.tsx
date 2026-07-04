import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../types/auth';

type Role = AuthUser['role'];

export function RouteGuard({
  children,
  roles,
  permissions,
  mode = 'any',
}: {
  children: ReactNode;
  roles?: Role[];
  permissions?: string[];
  /** 'any' = at least one permission match, 'all' = every permission required */
  mode?: 'all' | 'any';
}) {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  // Permission-based check takes priority if provided
  if (permissions && user.permissions) {
    const hasPermission =
      mode === 'all'
        ? permissions.every((p) => user.permissions!.includes(p))
        : permissions.some((p) => user.permissions!.includes(p));
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  // Fall back to legacy role check
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
