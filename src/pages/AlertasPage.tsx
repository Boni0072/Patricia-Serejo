import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Filter } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAlertas } from '../hooks/useAlertas';
import { cn } from '../lib/format';
import type { Alerta } from '../types';

const sevOrder = { critico: 0, atencao: 1, ok: 2 };

export function AlertasPage() {
  const { alertas, isLoading } = useAlertas();
  const [sev, setSev] = useState<string | undefined>(undefined);
  const [modulo, setModulo] = useState<string | undefined>(undefined);

  const modulos = useMemo(() => Array.from(new Set(alertas.map((a) => a.modulo))), [alertas]);

  const filtered = useMemo(() => {
    let list = [...alertas].sort((a, b) => sevOrder[a.severidade] - sevOrder[b.severidade]);
    if (sev) list = list.filter((a) => a.severidade === sev);
    if (modulo) list = list.filter((a) => a.modulo === modulo);
    return list;
  }, [alertas, sev, modulo]);

  const counts = useMemo(() => ({
    critico: alertas.filter((a) => a.severidade === 'critico').length,
    atencao: alertas.filter((a) => a.severidade === 'atencao').length,
    ok: alertas.filter((a) => a.severidade === 'ok').length,
  }), [alertas]);

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader title="Alertas Inteligentes" subtitle="Regras automáticas aplicadas sobre os dados filtrados. Cada alerta leva ao registro de origem." />

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-danger/15 grid place-items-center"><AlertCircle size={20} className="text-danger" /></div>
          <div><p className="text-2xl font-bold text-content">{counts.critico}</p><p className="text-xs text-content-muted uppercase tracking-wide">Críticos</p></div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warning/15 grid place-items-center"><AlertTriangle size={20} className="text-warning" /></div>
          <div><p className="text-2xl font-bold text-content">{counts.atencao}</p><p className="text-xs text-content-muted uppercase tracking-wide">Atenção</p></div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/15 grid place-items-center"><CheckCircle2 size={20} className="text-success" /></div>
          <div><p className="text-2xl font-bold text-content">{counts.ok}</p><p className="text-xs text-content-muted uppercase tracking-wide">OK</p></div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-content-muted"><Filter size={14} /> Filtrar por:</div>
        <div className="w-44"><Select ariaLabel="Severidade" placeholder="Severidade" value={sev} onChange={(v) => setSev(v as string)} options={[{ label: 'Crítico', value: 'critico' }, { label: 'Atenção', value: 'atencao' }, { label: 'OK', value: 'ok' }]} clearable /></div>
        <div className="w-44"><Select ariaLabel="Módulo" placeholder="Módulo" value={modulo} onChange={(v) => setModulo(v as string)} options={modulos.map((m) => ({ label: m, value: m }))} clearable /></div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => { setSev(undefined); setModulo(undefined); }}>Limpar filtros</Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i} padding="md"><div className="h-16 shimmer rounded-lg" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Info size={28} className="mx-auto mb-2 text-content-muted opacity-50" />
          <p className="text-sm text-content">Nenhum alerta para os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => <AlertaRow key={a.id} alerta={a} />)}
        </div>
      )}
    </div>
  );
}

function AlertaRow({ alerta }: { alerta: Alerta }) {
  const cfg = {
    critico: { Icon: AlertCircle, tone: 'danger' as const, ring: 'border-l-danger' },
    atencao: { Icon: AlertTriangle, tone: 'warning' as const, ring: 'border-l-warning' },
    ok: { Icon: CheckCircle2, tone: 'success' as const, ring: 'border-l-success' },
  }[alerta.severidade];
  const { Icon } = cfg;
  return (
    <Card padding="md" className={cn('border-l-4', cfg.ring)}>
      <div className="flex items-start gap-3">
        <div className={cn('h-9 w-9 rounded-xl grid place-items-center shrink-0', `bg-${alerta.severidade === 'critico' ? 'danger' : alerta.severidade === 'atencao' ? 'warning' : 'success'}/15`)}>
          <Icon size={18} className={alerta.severidade === 'critico' ? 'text-danger' : alerta.severidade === 'atencao' ? 'text-warning' : 'text-success'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-content">{alerta.titulo}</h3>
            <Badge tone={cfg.tone}>{alerta.severidade}</Badge>
            <Badge tone="neutral">{alerta.modulo}</Badge>
          </div>
          <p className="text-xs text-content-muted mt-1">{alerta.descricao}</p>
        </div>
        {alerta.link && (
          <Link to={alerta.link}>
            <Button variant="ghost" size="sm">Abrir módulo</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
