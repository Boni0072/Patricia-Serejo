import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';

interface Props {
  children: React.ReactNode;
  papeis: Papel[];
}

export default function RotaProtegida({ children, papeis }: Props) {
  const { user, perfil, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Conectado, mas sem perfil válido (documento perfis/{uid} ausente ou sem papel).
  // Impede acesso a áreas protegidas e evita erros de permissão do Firestore.
  if (!perfil) {
    return <Navigate to="/login" state={{ from: location.pathname, semPerfil: true }} replace />;
  }

  if (!papeis.includes(perfil.papel)) {
    return <Navigate to={perfil.papel === 'admin' || perfil.papel === 'advogado' ? '/admin' : '/portal'} replace />;
  }

  return <>{children}</>;
}
