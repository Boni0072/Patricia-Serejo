import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { Gauge, TrendingUp, Target, Activity } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, computeKpis, DEFAULT_THRESHOLDS, type KpiResult } from '../lib/kpi';
import { formatPercent, formatNumber, formatCurrency, monthLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 };
const GRID = 'var(--border-subtle)';

interface Indicador {
  id: string;
  nome: string;
  categoria: 'Financeiro' | 'Operacional' | 'Liquidez' | 'Rentabilidade';
  valor: number;
  meta: number;
  unidade: 'percent' | 'number' | 'currency';
  historico: { label: string; valor: number }[];
  descricao: string;
}

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

function formatValor(valor: number, unidade: Indicador['unidade']): string {
  if (unidade === 'percent') return formatPercent(valor);
  if (unidade === 'currency') return formatCurrency(valor);
  return formatNumber(valor);
}

function HistoricoChart({ indicador }: { indicador: Indicador }) {
  const data = indicador.historico.map((h) => ({ ...h, meta: indicador.meta }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => indicador.unidade === 'currency' ? formatNumber(v, true) : formatNumber(v)} width={56} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }}
          formatter={(v: any) => [formatValor(Number(v), indicador.unidade), indicador.nome]}
        />
        <ReferenceLine y={indicador.meta} stroke="var(--status-warning)" strokeDasharray="4 4" label={{ value: 'Meta', position: 'right', fill: 'var(--text-muted)', fontSize: 10 }} />
        <Line type="monotone" dataKey="valor" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IndicadoresPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [categoria, setCategoria] = useState<'todos' | 'Financeiro' | 'Operacional' | 'Liquidez' | 'Rentabilidade'>('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const kpiSet = useMemo(() => {
    if (!records || records.length === 0) return null;
    return computeKpis(records, filtered, filters, DEFAULT_THRESHOLDS);
  }, [records, filtered, filters]);

  const indicadores = useMemo<Indicador[]>(() => {
    if (!kpiSet) return [];
    const hist = (k: KpiResult) => k.sparkline.map((s) => ({ label: s.label, valor: s.value }));
    return [
      { id: 'margem-ebitda', nome: 'Margem EBITDA', categoria: 'Rentabilidade', valor: kpiSet.margemEbitda.value, meta: 20, unidade: 'percent', historico: hist(kpiSet.margemEbitda), descricao: 'Margem operacional antes de juros, impostos, depreciação e amortização.' },
      { id: 'roi', nome: 'ROI', categoria: 'Rentabilidade', valor: kpiSet.roi.value, meta: 15, unidade: 'percent', historico: hist(kpiSet.roi), descricao: 'Retorno sobre o investimento em projetos de CAPEX.' },
      { id: 'roic', nome: 'ROIC', categoria: 'Rentabilidade', valor: kpiSet.roic.value, meta: 12, unidade: 'percent', historico: hist(kpiSet.roic), descricao: 'Retorno sobre o capital investido.' },
      { id: 'ebitda', nome: 'EBITDA', categoria: 'Financeiro', valor: kpiSet.ebitda.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.ebitda), descricao: 'Lucro antes de juros, impostos, depreciação e amortização.' },
      { id: 'receita', nome: 'Receita', categoria: 'Financeiro', valor: kpiSet.receita.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.receita), descricao: 'Receita líquida do período.' },
      { id: 'capex', nome: 'CAPEX', categoria: 'Financeiro', valor: kpiSet.capex.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.capex), descricao: 'Investimento de capital no período.' },
      { id: 'opex', nome: 'OPEX', categoria: 'Operacional', valor: kpiSet.opex.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.opex), descricao: 'Despesas operacionais do período.' },
      { id: 'budget', nome: 'Budget', categoria: 'Operacional', valor: kpiSet.budget.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.budget), descricao: 'Orçamento total do período.' },
      { id: 'realizado', nome: 'Realizado', categoria: 'Operacional', valor: kpiSet.realizado.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.realizado), descricao: 'Realizado acumulado do período.' },
      { id: 'fluxo-caixa', nome: 'Fluxo de Caixa', categoria: 'Liquidez', valor: kpiSet.fluxoCaixa.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.fluxoCaixa), descricao: 'Fluxo de caixa livre do período.' },
      { id: 'capital-giro', nome: 'Capital de Giro', categoria: 'Liquidez', valor: kpiSet.capitalGiro.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.capitalGiro), descricao: 'Capital de giro estimado.' },
      { id: 'lucro-liquido', nome: 'Lucro Líquido', categoria: 'Financeiro', valor: kpiSet.lucroLiquido.value, meta: 0, unidade: 'currency', historico: hist(kpiSet.lucroLiquido), descricao: 'Resultado líquido do exercício.' },
    ];
  }, [kpiSet]);

  const filteredIndicadores = useMemo(() => {
    if (categoria === 'todos') return indicadores;
    return indicadores.filter((i) => i.categoria === categoria);
  }, [indicadores, categoria]);

  const selected = useMemo(() => indicadores.find((i) => i.id === selectedId) ?? filteredIndicadores[0] ?? null, [selectedId, indicadores, filteredIndicadores]);

  const summaryKpis = useMemo(() => {
    if (!kpiSet) return null;
    const sl = Array.from({ length: 12 }, (_, i) => ({ label: monthLabel(i + 1), value: 70 + (i % 5) }));
    return {
      total: buildKpi(indicadores.length, 10, sl, true, indicadores.length === 0),
      acimaMeta: buildKpi(indicadores.filter((i) => i.meta > 0 && i.valor >= i.meta).length, 5, sl, true, indicadores.length === 0),
      abaixoMeta: buildKpi(indicadores.filter((i) => i.meta > 0 && i.valor < i.meta).length, 3, sl, false, indicadores.length === 0),
      saude: buildKpi(indicadores.length > 0 ? (indicadores.filter((i) => i.meta === 0 || i.valor >= i.meta).length / indicadores.length) * 100 : 0, 80, sl, true, indicadores.length === 0),
    };
  }, [kpiSet, indicadores]);

  const statusForMeta = (ind: Indicador): Status => {
    if (ind.meta === 0) return 'info';
    if (ind.valor >= ind.meta * 1.1) return 'success';
    if (ind.valor >= ind.meta * 0.9) return 'warning';
    return 'danger';
  };

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Indicadores"
        subtitle="Catálogo de KPIs com metas, histórico e comparativo de performance."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores globais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !summaryKpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Total de KPIs" icon={Gauge} kpi={summaryKpis.total} />
              <KpiCard index={1} label="Acima da Meta" icon={TrendingUp} kpi={summaryKpis.acimaMeta} />
              <KpiCard index={2} label="Abaixo da Meta" icon={Target} kpi={summaryKpis.abaixoMeta} higherIsBetter={false} />
              <KpiCard index={3} label="Saúde Geral" icon={Activity} kpi={summaryKpis.saude} format="percent" />
            </>
          )}
        </div>
      </section>

      <Tabs
        defaultId="todos"
        onChange={(v) => setCategoria(v as typeof categoria)}
        tabs={[
          { id: 'todos', label: 'Todos', content: null },
          { id: 'Financeiro', label: 'Financeiro', content: null },
          { id: 'Operacional', label: 'Operacional', content: null },
          { id: 'Liquidez', label: 'Liquidez', content: null },
          { id: 'Rentabilidade', label: 'Rentabilidade', content: null },
        ]}
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <Card padding="md">
          <CardHeader title="Catálogo de KPIs" subtitle="Clique para ver o histórico" action={<Badge tone="info">{filteredIndicadores.length}</Badge>} />
          {isLoading ? <Skeleton className="h-[400px] w-full rounded-xl" /> : filteredIndicadores.length === 0 ? (
            <div className="h-[300px] grid place-items-center text-sm text-content-muted">Sem indicadores para os filtros selecionados.</div>
          ) : (
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {filteredIndicadores.map((ind) => {
                const tone = statusForMeta(ind);
                const isSelected = selected?.id === ind.id;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedId(ind.id)}
                    className={`w-full text-left flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg transition-all ${isSelected ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-surface-hover'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-content truncate">{ind.nome}</p>
                      <p className="text-[11px] text-content-muted truncate">{ind.categoria}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-content tabular-nums">{formatValor(ind.valor, ind.unidade)}</p>
                        {ind.meta > 0 && <p className="text-[11px] text-content-muted">Meta: {formatValor(ind.meta, ind.unidade)}</p>}
                      </div>
                      <Badge tone={tone}>
                        {ind.meta === 0 ? 'n/d' : ind.valor >= ind.meta ? 'ok' : ind.valor >= ind.meta * 0.9 ? 'atenção' : 'abaixo'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="md">
          <CardHeader
            title={selected ? selected.nome : 'Selecione um KPI'}
            subtitle={selected?.descricao}
            action={selected ? <Badge tone={statusForMeta(selected)}>{selected.meta > 0 ? `Meta: ${formatValor(selected.meta, selected.unidade)}` : 'sem meta'}</Badge> : undefined}
          />
          {isLoading || !selected ? <Skeleton className="h-[260px] w-full rounded-xl" /> : (
            <>
              <div className="flex items-center gap-4 mb-3 px-1">
                <div>
                  <p className="text-[11px] text-content-muted uppercase tracking-wide">Atual</p>
                  <p className="text-2xl font-bold text-content tabular-nums">{formatValor(selected.valor, selected.unidade)}</p>
                </div>
                {selected.meta > 0 && (
                  <div>
                    <p className="text-[11px] text-content-muted uppercase tracking-wide">vs Meta</p>
                    <p className={`text-2xl font-bold tabular-nums ${selected.valor >= selected.meta ? 'text-success' : 'text-danger'}`}>
                      {selected.unidade === 'percent' ? `${selected.valor - selected.meta >= 0 ? '+' : ''}${(selected.valor - selected.meta).toFixed(1)}pp` : formatCurrency(selected.valor - selected.meta, true)}
                    </p>
                  </div>
                )}
              </div>
              <HistoricoChart indicador={selected} />
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

export default IndicadoresPage;
