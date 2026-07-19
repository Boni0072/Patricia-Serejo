import { ComponentType, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/format';

interface ExpandableChartProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: (height: number) => ReactNode;
  /** altura padrão do gráfico dentro do card (estado recolhido) */
  compactHeight?: number;
  /** altura do gráfico quando expandido em tela cheia */
  expandedHeight?: number;
  className?: string;
}

export function ExpandableChart({
  title,
  subtitle,
  badge,
  children,
  compactHeight = 260,
  expandedHeight = 460,
  className,
}: ExpandableChartProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn('card-base p-5', className)}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-content truncate">{title}</h3>
            {subtitle && <p className="text-xs text-content-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {badge}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Expandir ${title}`}
              title="Maximizar"
              className="h-7 w-7 grid place-items-center rounded-lg text-content-muted hover:text-content hover:bg-surface-hover transition-colors focus-ring"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        {children(compactHeight)}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        size="xl"
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 text-xs font-medium text-content-muted hover:text-content transition-colors"
          >
            <Minimize2 size={14} /> Recolher
          </button>
        }
      >
        {children(expandedHeight)}
      </Modal>
    </>
  );
}

export function withExpand<P extends object>(
  ChartComponent: ComponentType<P>,
  config: { title: string; subtitle?: string; badge?: ReactNode; compactHeight?: number; expandedHeight?: number },
) {
  return function ExpandableWrapper(props: P) {
    return (
      <ExpandableChart
        title={config.title}
        subtitle={config.subtitle}
        badge={config.badge}
        compactHeight={config.compactHeight}
        expandedHeight={config.expandedHeight}
      >
        {(height) => <ChartComponent {...props} height={height} />}
      </ExpandableChart>
    );
  };
}
