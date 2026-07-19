import { useMemo, useState } from 'react';
import { Target, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { BudgetVsRealChart } from '../components/charts/DashboardCharts';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, formatPercent, monthLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

interface BudgetRow {
  chave: string;
  budget: number;
  realizado: number;
  forecast: number;
  varianca: number;
  variancaPct: number;
  aderencia: number;
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

function aggBy(records: FactRecord[], keyFn: (r: FactRecord) => string | undefined): BudgetRow[] {
  const map = new Map<string, { budget: number; realizado: number; forecast: number }>();
  records.forEach((r) => {
    const k = keyFn(r);
    if (!k) return;
    const cur = map.get(k) ?? { budget: 0, realizado: 0, forecast: 0 };
    cur.budget += r.budget ?? 0;
    cur.realizado += Math.abs(r.realizado ?? 0);
    cur.forecast += r.forecast ?? 0;
    map.set(k, cur);
  });
  return Array.from(map.entries()).map(([chave, v]) => {
    const varianca = v.realizado - v.budget;
    const variancaPct = v.budget > 0 ? (varianca / v.budget) * 100 : 0;
    const aderencia = v.budget > 0 ? (v.realizado / v.budget) * 100 : 0;
    return { chave, ...v, varianca, variancaPct, aderencia };
  }).sort((a, b) => b.realizado - a.realizado);
}

function statusForAderencia(aderencia: number, budget: number): Status {
  if (budget === 0) return 'info';
  if (aderencia <= 95) return 'success';
  if (aderencia <= 100) return 'warning';
  return 'danger';
}

export function BudgetPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);
  const [aggKey, setAggKey] = useState<'centroCusto' | 'categoria' | 'empresa'>('centroCusto');

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const budgetRecords = useMemo(() => filtered.filter((r) => r.budget != null), [filtered]);

  const totals = useMemo(() => {
    const budget = budgetRecords.reduce((a, r) => a + (r.budget ?? 0), 0);
    const realizado = budgetRecords.reduce((a, r) => a + Math.abs(r.realizado ?? 0), 0);
    const forecast = budgetRecords.reduce((a, r) => a + (r.forecast ?? 0), 0);
    return { budget, realizado, forecast, varianca: realizado - budget, aderencia: budget > 0 ? (realizado / budget) * 100 : 0 };
  }, [budgetRecords]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const slBudget = sparkFor(records, (r) => r.reduce((a, x) => a + (x.budget ?? 0), 0), filters.ano);
    const slReal = sparkFor(records, (r) => r.reduce((a, x) => a + Math.abs(x.realizado ?? 0), 0), filters.ano);
    const slFc = sparkFor(records, (r) => r.reduce((a, x) => a + (x.forecast ?? 0), 0), filters.ano);
    const slVar = slBudget.map((p, i) => ({ label: p.label, value: p.value - slReal[i].value }));
    const prev = totals.budget * 0.9;
    return {
      budget: buildKpi(totals.budget, prev, slBudget, true, totals.budget === 0),
      realizado: buildKpi(totals.realizado, prev * 0.95, slReal, true, totals.realizado === 0),
      forecast: buildKpi(totals.forecast, prev * 0.97, slFc, true, totals.forecast === 0),
      varianca: buildKpi(totals.varianca, 0, slVar, false, totals.budget === 0),
    };
  }, [records, totals, filters]);

  const rows = useMemo(() => {
    if (aggKey === 'centroCusto') return aggBy(budgetRecords, (r) => r.centroCusto);
    if (aggKey === 'categoria') return aggBy(budgetRecords, (r) => r.categoria);
    return aggBy(budgetRecords, (r) => r.empresa);
  }, [budgetRecords, aggKey]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  const aggLabels: Record<typeof aggKey, string> = { centroCusto: 'Centro de Custo', categoria: 'Categoria', empresa: 'Empresa' };

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Budget x Real"
        subtitle="Acompanhamento orçamentário com aderência, variância e forecast por dimensão."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores orçamentários">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Budget" icon={Target} kpi={kpis.budget} higherIsBetter />
              <KpiCard index={1} label="Realizado" icon={CheckCircle2} kpi={kpis.realizado} />
              <KpiCard index={2} label="Forecast" icon={TrendingUp} kpi={kpis.forecast} />
              <KpiCard index={3} label="Variância" icon={AlertTriangle} kpi={kpis.varianca} higherIsBetter={false} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 mb-5">
        {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : (
          <BudgetVsRealChart data={filtered} onDrillDown={openDrill} />
        )}
      </section>

      <section>
        <Card padding="md">
          <CardHeader
            title="Acompanhamento por dimensão"
            subtitle="Budget, realizado, forecast e variância"
            action={
              <div className="flex items-center gap-1.5">
                {(Object.keys(aggLabels) as (typeof aggKey)[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setAggKey(k)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${aggKey === k ? 'bg-accent text-page' : 'text-content-muted hover:bg-surface-hover'}`}
                  >
                    {aggLabels[k]}
                  </button>
                ))}
              </div>
            }
          />
          {isLoading ? <Skeleton className="h-[360px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Item', 'Budget', 'Realizado', 'Forecast', 'Variância', 'Variância %', 'Aderência', 'Status'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-4 py-2.5 border-b border-border-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-content-muted">Nenhum dado orçamentário para os filtros selecionados.</td></tr>
                  ) : rows.map((r) => (
                    <tr
                      key={r.chave}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ [aggKey]: r.chave } as Partial<FactRecord>, `Budget x Real — ${r.chave}`)}
                    >
                      <td className="px-4 py-2.5 text-content whitespace-nowrap">{r.chave}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(r.budget, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content font-semibold whitespace-nowrap">{formatCurrency(r.realizado, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(r.forecast, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${r.varianca <= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(r.varianca, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${r.variancaPct <= 0 ? 'text-success' : 'text-danger'}`}>{formatPercent(r.variancaPct)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content whitespace-nowrap">{formatPercent(r.aderencia)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Badge tone={statusForAderencia(r.aderencia, r.budget)}>
                          {r.budget === 0 ? 'n/d' : r.aderencia <= 95 ? 'ok' : r.aderencia <= 100 ? 'atenção' : 'estourado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-hover font-bold">
                    <td className="px-4 py-3 text-content">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content-muted">{formatCurrency(totals.budget, true)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content">{formatCurrency(totals.realizado, true)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content-muted">{formatCurrency(totals.forecast, true)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${totals.varianca <= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totals.varianca, true)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${totals.varianca <= 0 ? 'text-success' : 'text-danger'}`}>{formatPercent(totals.budget > 0 ? (totals.varianca / totals.budget) * 100 : 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content">{formatPercent(totals.aderencia)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={statusForAderencia(totals.aderencia, totals.budget)}>
                        {totals.budget === 0 ? 'n/d' : totals.aderencia <= 95 ? 'ok' : totals.aderencia <= 100 ? 'atenção' : 'estourado'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
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

export default BudgetPage;
