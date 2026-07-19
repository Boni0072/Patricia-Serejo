import { useMemo, useState } from 'react';
import { FolderKanban, Calendar, DollarSign, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, formatPercent, deltaPct, monthLabel } from '../lib/format';
import type { FactRecord, Status } from '../types';

interface ProjetoRow {
  id: string;
  nome: string;
  empresa: string;
  responsavel: string;
  inicio: string;
  fim: string;
  orcamento: number;
  realizado: number;
  status: 'em_andamento' | 'concluido' | 'atrasado' | 'parado';
  progresso: number;
}

const PROJETO_NOMES = [
  'Implantação ERP', 'Expansão Loja SP', 'Automação Fiscal', 'Migração Cloud',
  'Reforma Galpão', 'Novo CRM', 'Auditoria Tributária', 'Centralização Compras',
  'Digitalização RH', 'Rebranding', 'Logística Reversa', 'Energia Solar',
];

const RESPONSAVEIS = ['Ana Costa', 'Bruno Lima', 'Carla Dias', 'Diego Reis', 'Eva Nunes', 'Felipe Souza'];

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

function deterministicValue(seed: number, min: number, max: number): number {
  const r = (Math.sin(seed * 999) + 1) / 2;
  return Math.round(min + r * (max - min));
}

export function ProjetosPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const projetos = useMemo<ProjetoRow[]>(() => {
    const empresasSet = new Set(filtered.map((r) => r.empresa));
    const empresas = empresasSet.size > 0 ? Array.from(empresasSet) : ['Matriz'];
    const anoBase = filters.ano ?? 2025;
    const baseSeed = anoBase * 100 + (filters.mes ?? 7);

    const allProjetos: { nome: string; empresa: string; responsavel: string; inicio: string; fim: string; orcamento: number; realizado: number; status: ProjetoRow['status']; progresso: number }[] = [];
    PROJETO_NOMES.forEach((nome, i) => {
      const empresa = empresas[i % empresas.length];
      const responsavel = RESPONSAVEIS[i % RESPONSAVEIS.length];
      const seed = baseSeed + i;
      const inicioMes = deterministicValue(seed, 1, 6);
      const duracaoMeses = deterministicValue(seed + 1, 3, 12);
      const fimMes = inicioMes + duracaoMeses;
      const orcamento = deterministicValue(seed + 2, 50000, 2000000);
      const realizadoPct = deterministicValue(seed + 3, 10, 110);
      const realizado = (orcamento * realizadoPct) / 100;
      const progresso = Math.min(100, realizadoPct);
      const fimMesActual = fimMes > 12 ? fimMes - 12 : fimMes;
      const fimAno = fimMes > 12 ? anoBase + 1 : anoBase;
      const status: ProjetoRow['status'] = progresso >= 100 ? 'concluido' : realizadoPct < 30 && filters.mes != null && filters.mes >= inicioMes + duracaoMeses ? 'atrasado' : realizadoPct < 10 ? 'parado' : 'em_andamento';
      allProjetos.push({
        nome, empresa, responsavel,
        inicio: `${anoBase}-${String(inicioMes).padStart(2, '0')}-01`,
        fim: `${fimAno}-${String(fimMesActual).padStart(2, '0')}-28`,
        orcamento, realizado, status, progresso,
      });
    });

    return allProjetos.map((p, i) => ({ id: `proj-${i}`, ...p }));
  }, [filtered, filters]);

  const totals = useMemo(() => {
    const orcamento = projetos.reduce((a, p) => a + p.orcamento, 0);
    const realizado = projetos.reduce((a, p) => a + p.realizado, 0);
    const andamento = projetos.filter((p) => p.status === 'em_andamento').length;
    const atrasados = projetos.filter((p) => p.status === 'atrasado').length;
    const concluidos = projetos.filter((p) => p.status === 'concluido').length;
    return { orcamento, realizado, andamento, atrasados, concluidos };
  }, [projetos]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const spark = Array.from({ length: 12 }, (_, i) => ({ label: monthLabel(i + 1), value: 3 + (i % 4) }));
    const sparkOrc = Array.from({ length: 12 }, (_, i) => ({ label: monthLabel(i + 1), value: 200000 + i * 50000 }));
    const sparkReal = Array.from({ length: 12 }, (_, i) => ({ label: monthLabel(i + 1), value: 150000 + i * 40000 }));
    const sparkConc = Array.from({ length: 12 }, (_, i) => ({ label: monthLabel(i + 1), value: Math.min(12, i + 1) }));
    return {
      ativos: buildKpi(totals.andamento, 5, spark, true, projetos.length === 0),
      orcamento: buildKpi(totals.orcamento, totals.orcamento * 0.85, sparkOrc, true, projetos.length === 0),
      realizado: buildKpi(totals.realizado, totals.realizado * 0.8, sparkReal, true, projetos.length === 0),
      atrasados: buildKpi(totals.atrasados, 2, spark, false, projetos.length === 0),
    };
  }, [records, totals, projetos.length]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  const statusTone = (s: ProjetoRow['status']): Status => s === 'concluido' ? 'success' : s === 'em_andamento' ? 'info' : s === 'atrasado' ? 'warning' : 'danger';
  const statusLabel = (s: ProjetoRow['status']): string => s === 'em_andamento' ? 'Em Andamento' : s === 'concluido' ? 'Concluído' : s === 'atrasado' ? 'Atrasado' : 'Parado';

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Projetos"
        subtitle="Cronograma, budget x realizado, responsáveis e status dos projetos."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de projetos">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Projetos Ativos" icon={FolderKanban} kpi={kpis.ativos} />
              <KpiCard index={1} label="Orçamento Total" icon={DollarSign} kpi={kpis.orcamento} />
              <KpiCard index={2} label="Realizado" icon={Calendar} kpi={kpis.realizado} />
              <KpiCard index={3} label="Atrasados" icon={Users} kpi={kpis.atrasados} higherIsBetter={false} />
            </>
          )}
        </div>
      </section>

      <section>
        <Card padding="md">
          <CardHeader
            title="Carteira de projetos"
            subtitle="Cronograma, orçamento e progresso"
            action={<Badge tone="info">{projetos.length} projetos</Badge>}
          />
          {isLoading ? <Skeleton className="h-[400px] w-full rounded-xl" /> : projetos.length === 0 ? (
            <div className="h-[200px] grid place-items-center text-sm text-content-muted">Sem projetos para os filtros selecionados.</div>
          ) : (
            <div className="space-y-3">
              {projetos.map((p) => {
                const variacao = p.realizado - p.orcamento;
                const aderencia = p.orcamento > 0 ? (p.realizado / p.orcamento) * 100 : 0;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border-subtle p-4 hover:border-border transition-colors cursor-pointer"
                    onClick={() => openDrill({ projeto: p.nome }, `Projeto — ${p.nome}`)}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-content truncate">{p.nome}</h4>
                          <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                        </div>
                        <p className="text-[11px] text-content-muted">
                          {p.empresa} · {p.responsavel} · {new Date(p.inicio).toLocaleDateString('pt-BR')} → {new Date(p.fim).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-content tabular-nums">{formatCurrency(p.realizado, true)}</p>
                        <p className="text-[11px] text-content-muted">de {formatCurrency(p.orcamento, true)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-content-muted/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${p.status === 'atrasado' ? 'bg-warning' : p.status === 'parado' ? 'bg-danger' : p.status === 'concluido' ? 'bg-success' : 'bg-accent'}`}
                          style={{ width: `${Math.min(100, p.progresso)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-content-muted w-12 text-right">{p.progresso.toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11px]">
                      <span className={variacao <= 0 ? 'text-success' : 'text-danger'}>
                        Variância: {formatCurrency(variacao, true)}
                      </span>
                      <span className="text-content-muted">Aderência: {formatPercent(aderencia)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <DrillDownDrawer
        open={!!drill}
        onClose={() => setDrill(null)}
        title={drill?.title ?? ''}
        subtitle={drill?.subtitle}
        filter={drill?.filter}
      />
    </div>
  );
}

export default ProjetosPage;
