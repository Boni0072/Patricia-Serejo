import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center animate-pulse">
            <span className="text-page font-bold text-lg">C</span>
          </div>
          <p className="text-sm text-content-muted">Carregando sessão…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
