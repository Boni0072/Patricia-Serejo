import { useMemo, useState } from 'react';
import { Hammer, TrendingUp, Building2, Calendar } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { CapexPorCategoriaChart } from '../components/charts/DashboardCharts';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, formatPercent, monthLabel, deltaPct } from '../lib/format';
import { paletteColor } from '../lib/chartColors';
import type { FactRecord, Status } from '../types';

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

function statusForAderencia(aderencia: number, budget: number): Status {
  if (budget === 0) return 'info';
  if (aderencia <= 95) return 'success';
  if (aderencia <= 105) return 'warning';
  return 'danger';
}

export function CapexPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const capexRecords = useMemo(() => filtered.filter((r) => r.tipoMovimento === 'CAPEX'), [filtered]);

  const totals = useMemo(() => {
    const valor = capexRecords.reduce((a, r) => a + Math.abs(r.valor), 0);
    const budget = capexRecords.reduce((a, r) => a + (r.budget ?? 0), 0);
    const realizado = capexRecords.reduce((a, r) => a + Math.abs(r.realizado ?? 0), 0);
    const depreciacao = capexRecords.reduce((a, r) => a + Math.abs(r.depreciacao ?? 0), 0);
    return { valor, budget, realizado, depreciacao, aderencia: budget > 0 ? (realizado / budget) * 100 : 0 };
  }, [capexRecords]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();
    const prevRecords = records.filter((r) => filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1));
    const prevValor = prevRecords.filter((r) => r.tipoMovimento === 'CAPEX').reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevBudget = prevRecords.filter((r) => r.tipoMovimento === 'CAPEX').reduce((a, r) => a + (r.budget ?? 0), 0);
    const prevDep = prevRecords.filter((r) => r.tipoMovimento === 'CAPEX').reduce((a, r) => a + Math.abs(r.depreciacao ?? 0), 0);

    return {
      investido: buildKpi(totals.valor, prevValor, sparkFor(records, (r) => r.filter((x) => x.tipoMovimento === 'CAPEX').reduce((a, x) => a + Math.abs(x.valor), 0), filters.ano), false, totals.valor === 0),
      budget: buildKpi(totals.budget, prevBudget, sparkFor(records, (r) => r.filter((x) => x.tipoMovimento === 'CAPEX').reduce((a, x) => a + (x.budget ?? 0), 0), filters.ano), true, totals.budget === 0),
      depreciacao: buildKpi(totals.depreciacao, prevDep, sparkFor(records, (r) => r.filter((x) => x.tipoMovimento === 'CAPEX').reduce((a, x) => a + Math.abs(x.depreciacao ?? 0), 0), filters.ano), false, totals.depreciacao === 0),
      aderencia: buildKpi(totals.aderencia, 100, sparkFor(records, (r) => {
        const b = r.filter((x) => x.tipoMovimento === 'CAPEX').reduce((a, x) => a + (x.budget ?? 0), 0);
        const re = r.filter((x) => x.tipoMovimento === 'CAPEX').reduce((a, x) => a + Math.abs(x.realizado ?? 0), 0);
        return b > 0 ? (re / b) * 100 : 0;
      }, filters.ano), true, totals.budget === 0),
    };
  }, [records, totals, filters]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { valor: number; budget: number; realizado: number; count: number }>();
    capexRecords.forEach((r) => {
      const k = r.categoria ?? 'Outros';
      const cur = map.get(k) ?? { valor: 0, budget: 0, realizado: 0, count: 0 };
      cur.valor += Math.abs(r.valor);
      cur.budget += r.budget ?? 0;
      cur.realizado += Math.abs(r.realizado ?? 0);
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries()).map(([categoria, v]) => ({
      categoria, ...v, aderencia: v.budget > 0 ? (v.realizado / v.budget) * 100 : 0,
    })).sort((a, b) => b.valor - a.valor);
  }, [capexRecords]);

  const porEmpresa = useMemo(() => {
    const map = new Map<string, number>();
    capexRecords.forEach((r) => map.set(r.empresa, (map.get(r.empresa) ?? 0) + Math.abs(r.valor)));
    return Array.from(map.entries()).map(([empresa, valor]) => ({ empresa, valor })).sort((a, b) => b.valor - a.valor);
  }, [capexRecords]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="CAPEX"
        subtitle="Investimentos de capital por categoria, empresa e aderência orçamentária."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de CAPEX">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Investido" icon={Hammer} kpi={kpis.investido} higherIsBetter={false} onClick={() => openDrill({ tipoMovimento: 'CAPEX' }, 'CAPEX — detalhamento')} />
              <KpiCard index={1} label="Budget CAPEX" icon={TrendingUp} kpi={kpis.budget} />
              <KpiCard index={2} label="Depreciação" icon={Building2} kpi={kpis.depreciacao} higherIsBetter={false} />
              <KpiCard index={3} label="Aderência" icon={Calendar} kpi={kpis.aderencia} format="percent" />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <div className="lg:col-span-2">
          {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : <CapexPorCategoriaChart data={filtered} onDrillDown={openDrill} />}
        </div>
        <Card padding="md">
          <CardHeader title="Investimento por empresa" subtitle="Distribuição do CAPEX" />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : porEmpresa.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-content-muted">Sem dados.</div>
          ) : (
            <div className="space-y-3 pt-1">
              {porEmpresa.map((e, i) => {
                const max = porEmpresa[0]?.valor ?? 1;
                const pct = (e.valor / max) * 100;
                return (
                  <button key={e.empresa} onClick={() => openDrill({ tipoMovimento: 'CAPEX', empresa: e.empresa }, `CAPEX — ${e.empresa}`)} className="w-full text-left group">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-content">{e.empresa}</span>
                      <span className="font-semibold text-content tabular-nums">{formatCurrency(e.valor, true)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-content-muted/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${pct}%`, background: paletteColor(i) }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section>
        <Card padding="md">
          <CardHeader title="CAPEX por categoria" subtitle="Budget, realizado, aderência e contagem" action={<Badge tone="info">{porCategoria.length} categorias</Badge>} />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Categoria', 'Investido', 'Budget', 'Realizado', 'Aderência', 'Lançamentos', 'Status'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-4 py-2.5 border-b border-border-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porCategoria.map((c) => (
                    <tr
                      key={c.categoria}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ tipoMovimento: 'CAPEX', categoria: c.categoria }, `CAPEX — ${c.categoria}`)}
                    >
                      <td className="px-4 py-2.5 text-content whitespace-nowrap">{c.categoria}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-content whitespace-nowrap">{formatCurrency(c.valor, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(c.budget, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content whitespace-nowrap">{formatCurrency(c.realizado, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content whitespace-nowrap">{formatPercent(c.aderencia)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-content-muted whitespace-nowrap">{c.count}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Badge tone={statusForAderencia(c.aderencia, c.budget)}>
                          {c.budget === 0 ? 'n/d' : c.aderencia <= 95 ? 'ok' : c.aderencia <= 105 ? 'atenção' : 'estourado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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

export default CapexPage;
