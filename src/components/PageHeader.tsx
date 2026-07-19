import { type ReactNode } from 'react';
import { RefreshCw, Maximize2, Sun, Moon, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { useThemeStore } from '../store/theme';
import { useAlertas } from '../hooks/useAlertas';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function PageHeader({ title, subtitle, actions, onRefresh, refreshing }: HeaderProps) {
  const { theme, toggle } = useThemeStore();
  const { naoLidos } = useAlertas();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6 animate-slide-up">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-content tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-content-muted mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {onRefresh && (
          <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />} onClick={onRefresh} className="rounded-full">
            Atualizar
          </Button>
        )}
        <Link to="/alertas" className="relative" aria-label="Alertas">
          <Button variant="outline" size="icon" className="rounded-full">
            <Bell size={16} />
          </Button>
          {naoLidos > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 grid place-items-center text-[10px] font-bold bg-danger text-white rounded-full">{naoLidos}</span>
          )}
        </Link>
        <Button variant="outline" size="icon" className="rounded-full" onClick={toggleFullscreen} aria-label="Tela cheia">
          <Maximize2 size={15} />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full" onClick={toggle} aria-label="Alternar tema">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  );
}
