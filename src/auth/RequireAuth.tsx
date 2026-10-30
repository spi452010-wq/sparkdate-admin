import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { AdminRole } from '../api/types';
import { Spinner } from '../components/ui';

export function RequireAuth({ roles, children }: { roles?: AdminRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Checking session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role === 'user' || (roles && !(roles as string[]).includes(user.role)))
    return <div role="alert" className="card"><h1>Access denied</h1><p>Your role ({user.role}) cannot open this page.</p></div>;
  return <>{children}</>;
}
