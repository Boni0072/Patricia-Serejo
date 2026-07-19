import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bell, Settings, Menu, Users } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS } from './Sidebar';
import { cn } from '../lib/format';
import { useAlertas } from '../hooks/useAlertas';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { naoLidos } = useAlertas();

  const quick = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, path: '/' },
    { id: 'alertas', label: 'Alertas', icon: Bell, path: '/alertas' },
    { id: 'usuarios', label: 'Usuários', icon: Users, path: '/usuarios' },
    { id: 'config', label: 'Ajustes', icon: Settings, path: '/configuracoes' },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border-subtle flex items-center justify-around px-2 py-1.5">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <NavLink key={q.id} to={q.path} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px]', isActive ? 'text-accent' : 'text-content-muted')}>
              <span className="relative">
                <Icon size={20} />
                {q.id === 'alertas' && naoLidos > 0 && <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-0.5 grid place-items-center text-[9px] font-bold bg-danger text-white rounded-full">{naoLidos}</span>}
              </span>
              {q.label}
            </NavLink>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-content-muted">
          <Menu size={20} />
          Mais
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div className="md:hidden fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute right-0 top-0 h-full w-72 bg-surface border-l border-border-subtle p-4 overflow-y-auto"
              initial={{ x: 288 }} animate={{ x: 0 }} exit={{ x: 288 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">Módulos</p>
              <div className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => cn('flex items-center gap-3 h-10 rounded-lg text-sm px-3', isActive ? 'bg-accent text-page font-semibold' : 'text-content-muted hover:text-content hover:bg-surface-hover', item.emBreve && 'opacity-60')}
                    >
                      <Icon size={18} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.emBreve && <span className="text-[9px] uppercase font-bold bg-content-muted/15 text-content-muted px-1.5 py-0.5 rounded">breve</span>}
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
