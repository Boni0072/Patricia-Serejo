import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Wallet, ShieldCheck, Hammer, Boxes, Banknote,
  TrendingUp, Target, ShoppingCart, Package, FolderKanban, Building2,
  Gauge, Bell, Database, Settings, ChevronLeft, Sparkles, FileSpreadsheet,
  Calculator, Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/format';
import { useAlertas } from '../hooks/useAlertas';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
  emBreve?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard, path: '/' },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, path: '/financeiro' },
  { id: 'controladoria', label: 'Controladoria', icon: ShieldCheck, path: '/controladoria' },
  { id: 'capex', label: 'CAPEX', icon: Hammer, path: '/capex' },
  { id: 'opex', label: 'OPEX', icon: Boxes, path: '/opex' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: Banknote, path: '/fluxo-caixa' },
  { id: 'resultado', label: 'Resultado', icon: TrendingUp, path: '/resultado' },
  { id: 'ebitda', label: 'EBITDA', icon: Calculator, path: '/ebitda' },
  { id: 'budget', label: 'Budget x Real', icon: Target, path: '/budget' },
  { id: 'compras', label: 'Compras', icon: ShoppingCart, path: '/compras' },
  { id: 'estoque', label: 'Estoque', icon: Package, path: '/estoque' },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban, path: '/projetos' },
  { id: 'imobilizado', label: 'Imobilizado', icon: Building2, path: '/imobilizado' },
  { id: 'indicadores', label: 'Indicadores', icon: Gauge, path: '/indicadores' },
  { id: 'alertas', label: 'Alertas', icon: Bell, path: '/alertas' },
  { id: 'lancamentos', label: 'Lançamentos', icon: FileSpreadsheet, path: '/lancamentos' },
  { id: 'fontes', label: 'Fontes de Dados', icon: Database, path: '/fontes' },
  { id: 'usuarios', label: 'Usuários e Acessos', icon: Users, path: '/usuarios' },
  { id: 'config', label: 'Configurações', icon: Settings, path: '/configuracoes' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { naoLidos } = useAlertas();

  return (
    <motion.aside
      animate={{ width: collapsed ? 112 : 280 }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="hidden md:flex flex-col shrink-0 bg-surface border-r border-border-subtle h-screen sticky top-0"
    >
      <div className={cn('flex items-center h-28 px-4 border-b border-border-subtle', collapsed ? 'justify-center px-0' : 'gap-2.5')}>
        {collapsed ? (
          <img src="/cerne-logo-icon-v2.svg" alt="Cerne" className="h-24 w-24 shrink-0" />
        ) : (
          <img src="/cerne-logo-full-v2.svg" alt="Cerne" className="h-[77px] max-w-[336px] object-contain" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const badge = item.id === 'alertas' && naoLidos > 0 ? naoLidos : item.badge;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 h-10 rounded-lg text-sm transition-all focus-ring',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-accent text-page font-semibold shadow-sm'
                  : 'text-content-muted hover:text-content hover:bg-surface-hover',
                item.emBreve && !active && 'opacity-60',
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.emBreve && (
                    <span className={cn('text-[9px] uppercase font-bold px-1.5 py-0.5 rounded', active ? 'bg-page/20 text-page' : 'bg-content-muted/15 text-content-muted')}>breve</span>
                  )}
                  {!item.emBreve && badge != null && badge > 0 && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center', active ? 'bg-page text-accent' : 'bg-danger text-white')}>{badge}</span>
                  )}
                </>
              )}
              {collapsed && badge != null && badge > 0 && !item.emBreve && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="mx-2.5 mb-3 h-9 rounded-lg flex items-center justify-center gap-2 text-xs text-content-muted hover:text-content hover:bg-surface-hover transition-colors focus-ring"
      >
        <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span>Recolher</span>}
      </button>
    </motion.aside>
  );
}
