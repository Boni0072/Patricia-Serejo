import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Card } from './ui/Card';
import { Sparkline } from './ui/Sparkline';
import { cn, formatCurrency, formatSignedPercent } from '../lib/format';
import type { KpiResult } from '../lib/kpi';

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  kpi: KpiResult;
  format?: 'currency' | 'percent' | 'number';
  higherIsBetter?: boolean;
  index?: number;
  onClick?: () => void;
}

export function KpiCard({ label, icon: Icon, kpi, format = 'currency', higherIsBetter = true, index = 0, onClick }: KpiCardProps) {
  const value = format === 'percent' ? `${kpi.value.toFixed(1)}%` : format === 'number' ? kpi.value.toLocaleString('pt-BR') : formatCurrency(kpi.value, true);
  const delta = kpi.deltaPct;
  const deltaPositive = delta >= 0;
  const deltaGood = higherIsBetter ? deltaPositive : !deltaPositive;
  const DeltaIcon = Math.abs(delta) < 0.01 ? Minus : deltaPositive ? TrendingUp : TrendingDown;

  const iconBg =
    kpi.status === 'success' ? 'bg-success/15 text-success'
    : kpi.status === 'warning' ? 'bg-warning/15 text-warning'
    : kpi.status === 'danger' ? 'bg-danger/15 text-danger'
    : 'bg-info/15 text-info';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card hover={!!onClick} onClick={onClick} padding="md" className="h-full group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('h-9 w-9 rounded-xl grid place-items-center shrink-0', iconBg)}>
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted truncate">{label}</p>
              {kpi.incomplete ? (
                <div className="flex items-center gap-1.5 mt-1.5 text-warning">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-medium">dado incompleto</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-content mt-1 tabular-nums leading-none">{value}</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <Sparkline data={kpi.sparkline} status={kpi.status} />
          </div>
        </div>

        {!kpi.incomplete && (
          <div className="flex items-center gap-2 mt-3">
            <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', deltaGood ? 'text-success' : 'text-danger')}>
              <DeltaIcon size={13} />
              {formatSignedPercent(delta)}
            </span>
            <span className="text-[11px] text-content-muted">vs período anterior</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card padding="md" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full">
          <div className="h-9 w-9 rounded-xl bg-content-muted/10 shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-content-muted/10 rounded shimmer" />
            <div className="h-6 w-28 bg-content-muted/10 rounded shimmer" />
          </div>
        </div>
        <div className="h-9 w-20 bg-content-muted/10 rounded shimmer" />
      </div>
      <div className="h-3 w-32 bg-content-muted/10 rounded shimmer mt-4" />
    </Card>
  );
}
