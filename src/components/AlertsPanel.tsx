import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import type { Alerta } from '../types';

interface AlertsPanelProps {
  alertas: Alerta[];
  loading?: boolean;
  limit?: number;
  showHeader?: boolean;
}

const sevConfig = {
  critico: { icon: AlertCircle, tone: 'danger' as const, label: 'Crítico' },
  atencao: { icon: AlertTriangle, tone: 'warning' as const, label: 'Atenção' },
  ok: { icon: Info, tone: 'success' as const, label: 'OK' },
};

export function AlertsPanel({ alertas, loading, limit = 6, showHeader = true }: AlertsPanelProps) {
  const sorted = useMemo(
    () => [...alertas].sort((a, b) => (a.severidade === 'critico' ? -1 : b.severidade === 'critico' ? 1 : 0)),
    [alertas],
  );
  const shown = sorted.slice(0, limit);
  const criticos = sorted.filter((a) => a.severidade === 'critico').length;
  const atencao = sorted.filter((a) => a.severidade === 'atencao').length;

  const content = (
    <>
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-10">
          <div className="h-10 w-10 rounded-full bg-success/15 grid place-items-center mx-auto mb-2">
            <Info size={18} className="text-success" />
          </div>
          <p className="text-sm text-content">Nenhum alerta ativo</p>
          <p className="text-xs text-content-muted mt-1">Tudo dentro do esperado para o período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((a) => {
            const cfg = sevConfig[a.severidade];
            const Icon = cfg.icon;
            return (
              <Link
                key={a.id}
                to={a.link ?? '/alertas'}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
              >
                <div className={`h-8 w-8 rounded-lg shrink-0 grid place-items-center bg-${a.severidade === 'critico' ? 'danger' : a.severidade === 'atencao' ? 'warning' : 'success'}/15`}>
                  <Icon size={15} className={a.severidade === 'critico' ? 'text-danger' : a.severidade === 'atencao' ? 'text-warning' : 'text-success'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content font-medium truncate">{a.titulo}</p>
                  <p className="text-xs text-content-muted line-clamp-2 mt-0.5">{a.descricao}</p>
                </div>
                <ArrowRight size={14} className="text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  if (!showHeader) return content;

  return (
    <Card padding="md">
      <CardHeader
        title="Alertas inteligentes"
        subtitle="Regras automáticas aplicadas aos dados filtrados"
        action={
          <div className="flex items-center gap-1.5">
            {criticos > 0 && <Badge tone="danger" dot>{criticos} críticos</Badge>}
            {atencao > 0 && <Badge tone="warning" dot>{atencao} atenção</Badge>}
          </div>
        }
      />
      {content}
    </Card>
  );
}
