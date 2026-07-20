import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FolderOpen, MessageSquare, Calendar, User, LogOut, Menu, X, Home } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

const navItems = [
  { to: '/portal/processos', label: 'Meus Processos', icon: FolderOpen },
  { to: '/portal/mensagens', label: 'Mensagens', icon: MessageSquare },
  { to: '/portal/agenda', label: 'Agenda', icon: Calendar },
  { to: '/portal/perfil', label: 'Meu Perfil', icon: User },
];

export default function PortalLayout() {
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-brand-900 text-brand-100 flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-brand-800">
          <Logo comTexto variante="claro" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-800 text-gold-400'
                    : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm text-white font-medium truncate">{perfil?.nome}</p>
            <p className="text-xs text-brand-400 truncate">{perfil?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-brand-200 hover:bg-brand-800 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            Sair
          </button>
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-brand-300 hover:bg-brand-800 hover:text-white transition-colors w-full"
          >
            <Home size={18} />
            Voltar ao site
          </a>
        </div>
      </aside>

      {/* Header mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-brand-900 text-white">
        <div className="flex items-center justify-between h-16 px-4">
          <Logo variante="claro" />
          <button onClick={() => setMenuAberto(!menuAberto)} className="p-2">
            {menuAberto ? <X /> : <Menu />}
          </button>
        </div>
        {menuAberto && (
          <nav className="px-4 pb-4 space-y-1 animate-fade-in">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-brand-800 text-gold-400' : 'text-brand-200'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-brand-200 w-full"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </div>

      {/* Conteúdo */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
