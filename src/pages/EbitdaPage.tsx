import { useMemo, useState } from 'react';
import {
  TrendingUp, Percent, Scale, Calculator, ArrowUpRight, ArrowDownRight,
  Building2, Activity,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import {
  EbitdaEvolution, MarginEvolution, EbitdaPorEmpresa, EbitdaBridge,
  type EbitdaMonthlyPoint, type MarginPoint, type EbitdaEmpresaPoint, type EbitdaBridgeStep,
} from '../components/charts/EbitdaCharts';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, formatPercent, monthLabel, deltaPct } from '../lib/format';
import { cn } from '../lib/format';
import type { FactRecord, Status } from '../types';

const COGS_CATEGORIAS = ['Logística', 'Energia', 'Manutenção', 'Tributos'];

interface EbitdaComponents {
  receitaLiquida: number;
  cogs: number;
  despesasOp: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  margemBruta: number;
  margemEbitda: number;
}

interface EbitdaDetail {
  receitaLiquida: number;
  cogs: number;
  lucroBruto: number;
  despesasOp: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  margemBruta: number;
  margemEbitda: number;
}

function computeEbitda(records: FactRecord[]): EbitdaComponents {
  const receitaBruta = records.filter((r) => r.tipoMovimento === 'RECEITA').reduce((a, r) => a + r.valor, 0);
  const tributos = records.filter((r) => r.categoria === 'Tributos').reduce((a, r) => a + Math.abs(r.valor), 0);
  const receitaLiquida = receitaBruta - tributos;
  const cogs = records
    .filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && r.categoria && COGS_CATEGORIAS.includes(r.categoria))
    .reduce((a, r) => a + Math.abs(r.valor), 0);
  const lucroBruto = receitaLiquida - cogs;
  const despesasOp = records
    .filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && (!r.categoria || !COGS_CATEGORIAS.includes(r.categoria)))
    .reduce((a, r) => a + Math.abs(r.valor), 0);
  const ebitda = lucroBruto - despesasOp;
  const depreciacao = records.reduce((a, r) => a + Math.abs(r.depreciacao ?? 0), 0);
  const ebit = ebitda - depreciacao;
  return {
    receitaLiquida,
    cogs,
    despesasOp,
    ebitda,
    depreciacao,
    ebit,
    margemBruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
    margemEbitda: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
  };
}

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

function sparkFor(records: FactRecord[], picker: (r: FactRecord[]) => number, ano?: number) {
  const out: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ label: monthLabel(m), value: picker(records.filter((r) => r.mes === m && (ano == null || r.ano === ano))) });
  }
  return out;
}

export function EbitdaPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);
  const [tab, setTab] = useState<'evolucao' | 'margens' | 'categorias'>('evolucao');

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const ebitda = useMemo(() => computeEbitda(filtered), [filtered]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();
    const prevRecords = records.filter((r) =>
      filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1),
    );
    const prev = computeEbitda(prevRecords);

    const slEbitda = sparkFor(records, (r) => computeEbitda(r).ebitda, filters.ano);
    const slMargem = sparkFor(records, (r) => computeEbitda(r).margemEbitda, filters.ano);
    const slEbit = sparkFor(records, (r) => computeEbitda(r).ebit, filters.ano);
    const slReceitaLiq = sparkFor(records, (r) => computeEbitda(r).receitaLiquida, filters.ano);

    return {
      ebitda: buildKpi(ebitda.ebitda, prev.ebitda, slEbitda, true, ebitda.receitaLiquida === 0),
      ebit: buildKpi(ebitda.ebit, prev.ebit, slEbit, true, ebitda.receitaLiquida === 0),
      margemEbitda: buildKpi(ebitda.margemEbitda, prev.margemEbitda, slMargem, true, ebitda.receitaLiquida === 0),
      margemBruta: buildKpi(ebitda.margemBruta, prev.margemBruta, slReceitaLiq.map((p, i) => ({ label: p.label, value: slMargem[i]?.value ?? 0 })), true, ebitda.receitaLiquida === 0),
    };
  }, [records, ebitda, filters]);

  const evolucaoMensal = useMemo<EbitdaMonthlyPoint[]>(() => {
    if (!records) return [];
    const ano = filters.ano ?? new Date().getFullYear();
    const out: EbitdaMonthlyPoint[] = [];
    for (let m = 1; m <= 12; m++) {
      const recs = applyFilters(
        records.filter((r) => r.ano === ano && r.mes === m),
        { ...filters, ano: undefined, mes: undefined },
      );
      const e = computeEbitda(recs);
      out.push({ label: monthLabel(m), ebitda: e.ebitda, receita: e.receitaLiquida, margem: e.margemEbitda });
    }
    return out;
  }, [records, filters]);

  const margemSeries = useMemo<MarginPoint[]>(() => {
    if (!records) return [];
    const ano = filters.ano ?? new Date().getFullYear();
    const out: MarginPoint[] = [];
    for (let m = 1; m <= 12; m++) {
      const recs = applyFilters(
        records.filter((r) => r.ano === ano && r.mes === m),
        { ...filters, ano: undefined, mes: undefined },
      );
      const e = computeEbitda(recs);
      const lucroLiquido = e.ebit - e.receitaLiquida * 0.03 - (e.ebit - e.receitaLiquida * 0.03 > 0 ? (e.ebit - e.receitaLiquida * 0.03) * 0.34 : 0);
      out.push({
        label: monthLabel(m),
        margemBruta: e.margemBruta,
        margemEbitda: e.margemEbitda,
        margemLiquida: e.receitaLiquida > 0 ? (lucroLiquido / e.receitaLiquida) * 100 : 0,
      });
    }
    return out;
  }, [records, filters]);

  const porEmpresa = useMemo<EbitdaEmpresaPoint[]>(() => {
    const empresas = Array.from(new Set(filtered.map((r) => r.empresa)));
    return empresas.map((empresa) => {
      const recs = filtered.filter((r) => r.empresa === empresa);
      const e = computeEbitda(recs);
      return { empresa, ebitda: e.ebitda, margem: e.margemEbitda };
    });
  }, [filtered]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter((r) => r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA')
      .forEach((r) => {
        const key = r.categoria ?? 'Sem categoria';
        map.set(key, (map.get(key) ?? 0) + Math.abs(r.valor));
      });
    return Array.from(map.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filtered]);

  const bridge = useMemo<EbitdaBridgeStep[]>(() => {
    if (filtered.length === 0) return [];
    const steps: EbitdaBridgeStep[] = [];
    let running = 0;
    const push = (label: string, value: number, type: 'total' | 'positive' | 'negative') => {
      if (type === 'total') running = value;
      else running += value;
      steps.push({ label, value, type, running });
    };
    push('Receita Líq.', ebitda.receitaLiquida, 'total');
    push('COGS', -ebitda.cogs, 'negative');
    push('Lucro Bruto', ebitda.receitaLiquida - ebitda.cogs, 'total');
    push('Despesas Op.', -ebitda.despesasOp, 'negative');
    push('EBITDA', ebitda.ebitda, 'total');
    push('D&A', -ebitda.depreciacao, 'negative');
    push('EBIT', ebitda.ebit, 'total');
    return steps;
  }, [ebitda, filtered.length]);

  const dreLines = useMemo(() => [
    { label: 'Receita Líquida', value: ebitda.receitaLiquida, kind: 'header' as const, bold: true },
    { label: '(–) Custos (COGS)', value: -ebitda.cogs, kind: 'deduction' as const },
    { label: '(=) Lucro Bruto', value: ebitda.receitaLiquida - ebitda.cogs, kind: 'subtotal' as const, bold: true },
    { label: '(–) Despesas Operacionais (SGA)', value: -ebitda.despesasOp, kind: 'deduction' as const },
    { label: '(=) EBITDA', value: ebitda.ebitda, kind: 'result' as const, bold: true },
    { label: '(–) Depreciação e Amortização', value: -ebitda.depreciacao, kind: 'deduction' as const },
    { label: '(=) EBIT', value: ebitda.ebit, kind: 'subtotal' as const, bold: true },
  ], [ebitda]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="EBITDA"
        subtitle="Earnings Before Interest, Taxes, Depreciation and Amortization — análise detalhada do resultado operacional."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="KPIs EBITDA">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="EBITDA" icon={TrendingUp} kpi={kpis.ebitda} onClick={() => openDrill({}, 'EBITDA — detalhamento')} />
              <KpiCard index={1} label="EBIT" icon={Calculator} kpi={kpis.ebit} onClick={() => openDrill({}, 'EBIT — detalhamento')} />
              <KpiCard index={2} label="Margem EBITDA" icon={Percent} kpi={kpis.margemEbitda} format="percent" />
              <KpiCard index={3} label="Margem Bruta" icon={Scale} kpi={kpis.margemBruta} format="percent" />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <Card padding="md">
          <CardHeader title="DRE EBITDA" subtitle="Receita líquida → EBITDA → EBIT" action={<Badge tone="info">estimativa</Badge>} />
          {isLoading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <tbody>
                  {dreLines.map((line) => (
                    <tr
                      key={line.label}
                      className={cn(
                        'border-b border-border-subtle/40 hover:bg-surface-hover transition-colors',
                        line.kind === 'result' && 'bg-accent/5',
                      )}
                    >
                      <td className={cn(
                        'px-3 py-2.5',
                        line.bold ? 'font-semibold text-content' : line.kind === 'deduction' ? 'text-content-muted pl-6' : 'text-content',
                      )}>
                        {line.label}
                      </td>
                      <td className={cn(
                        'px-3 py-2.5 text-right tabular-nums whitespace-nowrap',
                        line.bold ? 'font-bold text-content' : line.value < 0 ? 'text-danger' : 'text-content',
                      )}>
                        {formatCurrency(line.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding="md">
          <CardHeader title="Bridge EBITDA → EBIT" subtitle="Do lucro bruto ao EBIT" />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : <EbitdaBridge steps={bridge} />}
        </Card>
      </section>

      <Card padding="md" className="mb-5">
        <CardHeader
          title="Evolução e decomposição"
          subtitle="Análise temporal e por dimensão"
          action={
            <div className="flex items-center gap-1 p-1 rounded-xl bg-page border border-border-subtle">
              {([['evolucao', 'Evolução'], ['margens', 'Margens'], ['categorias', 'Categorias']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'px-3 h-7 rounded-lg text-xs font-medium transition-all',
                    tab === id ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : tab === 'evolucao' ? (
          <div>
            <div className="flex items-center gap-4 mb-2 text-xs text-content-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-primary" /> EBITDA (R$)</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-info" /> Margem EBITDA (%)</span>
            </div>
            <EbitdaEvolution data={evolucaoMensal} />
          </div>
        ) : tab === 'margens' ? (
          <div>
            <div className="flex items-center gap-4 mb-2 text-xs text-content-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Margem Bruta</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-info" /> Margem EBITDA</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-primary" /> Margem Líquida</span>
            </div>
            <MarginEvolution data={margemSeries} />
          </div>
        ) : (
          <div className="space-y-2.5">
            {porCategoria.length === 0 ? (
              <div className="h-[200px] grid place-items-center text-sm text-content-muted">Sem despesas para decompor.</div>
            ) : (
              porCategoria.map((c) => {
                const pct = ebitda.receitaLiquida > 0 ? (c.valor / ebitda.receitaLiquida) * 100 : 0;
                return (
                  <div key={c.categoria} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-content font-medium">{c.categoria}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-content-muted tabular-nums">{formatCurrency(c.valor, true)}</span>
                        <span className="text-content-muted tabular-nums text-xs w-14 text-right">{formatPercent(pct)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all group-hover:from-accent group-hover:to-accent-primary"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card padding="md" className="lg:col-span-3">
          <CardHeader
            title="EBITDA por empresa"
            subtitle="Ranking de geração de valor por unidade"
            action={<Badge tone="info">{porEmpresa.length} empresas</Badge>}
          />
          {isLoading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : <EbitdaPorEmpresa data={porEmpresa} />}
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <CardHeader title="Ranking detalhado" subtitle="Margem EBITDA por empresa" action={<Building2 size={16} className="text-content-muted" />} />
          {isLoading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : porEmpresa.length === 0 ? (
            <div className="h-[200px] grid place-items-center text-sm text-content-muted">Sem dados.</div>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {[...porEmpresa]
                .sort((a, b) => b.margem - a.margem)
                .map((e) => {
                  const positive = e.ebitda >= 0;
                  const margemGood = e.margem >= 20;
                  const margemWarn = e.margem >= 0;
                  return (
                    <button
                      key={e.empresa}
                      onClick={() => openDrill({ empresa: e.empresa }, `EBITDA — ${e.empresa}`)}
                      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn(
                          'h-8 w-8 rounded-lg grid place-items-center shrink-0',
                          positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                        )}>
                          {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-content font-medium truncate">{e.empresa}</p>
                          <p className="text-[11px] text-content-muted tabular-nums">{formatCurrency(e.ebitda, true)}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold tabular-nums',
                        margemGood ? 'text-success' : margemWarn ? 'text-warning' : 'text-danger',
                      )}>
                        {formatPercent(e.margem)}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </Card>
      </section>

      <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-info/5 border border-info/20">
        <Activity size={15} className="text-info shrink-0 mt-0.5" />
        <p className="text-xs text-content-muted leading-relaxed">
          <strong className="text-content">EBITDA</strong> mede o resultado operacional antes de juros, impostos,
          depreciação e amortização. É um indicador proxy da capacidade de geração de caixa da operação.
          A margem EBITDA = EBITDA / Receita Líquida. Os valores são estimativas geradas a partir dos lançamentos disponíveis.
        </p>
      </div>

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

export default EbitdaPage;
