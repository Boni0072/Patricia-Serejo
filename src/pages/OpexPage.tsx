import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie,
} from 'recharts';
import { Boxes, TrendingDown, Building, Layers } from 'lucide-react';
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
import { formatCurrency, formatNumber, monthLabel, deltaPct } from '../lib/format';
import { paletteColor } from '../lib/chartColors';
import type { FactRecord, Status } from '../types';

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 };
const GRID = 'var(--border-subtle)';

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

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface border border-border-subtle shadow-card-hover px-3 py-2 text-xs">
      {label && <p className="text-content-muted mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-content">{p.name}: <strong>{formatCurrency(p.value)}</strong></span>
        </div>
      ))}
    </div>
  );
}

export function OpexPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const opexRecords = useMemo(() => filtered.filter((r) => r.tipoMovimento === 'OPEX'), [filtered]);

  const totals = useMemo(() => {
    const valor = opexRecords.reduce((a, r) => a + Math.abs(r.valor), 0);
    const budget = opexRecords.reduce((a, r) => a + (r.budget ?? 0), 0);
    return { valor, budget, aderencia: budget > 0 ? (valor / budget) * 100 : 0 };
  }, [opexRecords]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();
    const prevRecords = records.filter((r) => filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1));
    const prevValor = prevRecords.filter((r) => r.tipoMovimento === 'OPEX').reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevBudget = prevRecords.filter((r) => r.tipoMovimento === 'OPEX').reduce((a, r) => a + (r.budget ?? 0), 0);
    return {
      total: buildKpi(totals.valor, prevValor, sparkFor(records, (r) => r.filter((x) => x.tipoMovimento === 'OPEX').reduce((a, x) => a + Math.abs(x.valor), 0), filters.ano), false, totals.valor === 0),
      budget: buildKpi(totals.budget, prevBudget, sparkFor(records, (r) => r.filter((x) => x.tipoMovimento === 'OPEX').reduce((a, x) => a + (x.budget ?? 0), 0), filters.ano), true, totals.budget === 0),
      aderencia: buildKpi(totals.aderencia, 100, sparkFor(records, (r) => {
        const b = r.filter((x) => x.tipoMovimento === 'OPEX').reduce((a, x) => a + (x.budget ?? 0), 0);
        const v = r.filter((x) => x.tipoMovimento === 'OPEX').reduce((a, x) => a + Math.abs(x.valor), 0);
        return b > 0 ? (v / b) * 100 : 0;
      }, filters.ano), true, totals.budget === 0),
      ticket: buildKpi(opexRecords.length > 0 ? totals.valor / opexRecords.length : 0, prevValor / (prevRecords.filter((r) => r.tipoMovimento === 'OPEX').length || 1), sparkFor(records, (r) => {
        const recs = r.filter((x) => x.tipoMovimento === 'OPEX');
        const v = recs.reduce((a, x) => a + Math.abs(x.valor), 0);
        return recs.length > 0 ? v / recs.length : 0;
      }, filters.ano), false, opexRecords.length === 0),
    };
  }, [records, totals, opexRecords.length, filters]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { valor: number; count: number }>();
    opexRecords.forEach((r) => {
      const k = r.categoria ?? 'Outros';
      const cur = map.get(k) ?? { valor: 0, count: 0 };
      cur.valor += Math.abs(r.valor);
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries()).map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.valor - a.valor);
  }, [opexRecords]);

  const porCentro = useMemo(() => {
    const map = new Map<string, { valor: number; count: number }>();
    opexRecords.forEach((r) => {
      const k = r.centroCusto ?? 'Sem centro';
      const cur = map.get(k) ?? { valor: 0, count: 0 };
      cur.valor += Math.abs(r.valor);
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries()).map(([centroCusto, v]) => ({ centroCusto, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [opexRecords]);

  const mensal = useMemo(() => {
    const map = new Map<number, number>();
    for (let m = 1; m <= 12; m++) map.set(m, 0);
    opexRecords.forEach((r) => map.set(r.mes, (map.get(r.mes) ?? 0) + Math.abs(r.valor)));
    return Array.from(map.entries()).map(([m, v]) => ({ mes: m, label: monthLabel(m), valor: v }));
  }, [opexRecords]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="OPEX"
        subtitle="Despesas operacionais por categoria, centro de custo e evolução mensal."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de OPEX">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Total OPEX" icon={Boxes} kpi={kpis.total} higherIsBetter={false} onClick={() => openDrill({ tipoMovimento: 'OPEX' }, 'OPEX — detalhamento')} />
              <KpiCard index={1} label="Budget OPEX" icon={TrendingDown} kpi={kpis.budget} />
              <KpiCard index={2} label="Aderência" icon={Layers} kpi={kpis.aderencia} format="percent" />
              <KpiCard index={3} label="Ticket Médio" icon={Building} kpi={kpis.ticket} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="lg:col-span-2">
          <CardHeader title="Evolução mensal de OPEX" subtitle="Despesas operacionais por mês" />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mensal} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={56} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
                <Bar dataKey="valor" name="OPEX" fill="var(--status-warning)" radius={[4, 4, 0, 0]} maxBarSize={32} cursor="pointer" onClick={(d: any) => openDrill({ tipoMovimento: 'OPEX', mes: d.payload.mes }, `OPEX — ${monthLabel(d.payload.mes)}`)} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card padding="md">
          <CardHeader title="Distribuição por categoria" subtitle="Participação no total" />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : porCategoria.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-content-muted">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={porCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={2}>
                  {porCategoria.map((_, i) => <Cell key={i} fill={paletteColor(i)} />)}
                </Pie>
                <Tooltip content={<TooltipBox />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card padding="md">
          <CardHeader title="Top categorias" subtitle="Maiores despesas operacionais" action={<Badge tone="info">{porCategoria.length}</Badge>} />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : (
            <div className="space-y-2.5 pt-1">
              {porCategoria.slice(0, 8).map((c, i) => {
                const max = porCategoria[0]?.valor ?? 1;
                const pct = (c.valor / max) * 100;
                return (
                  <button key={c.categoria} onClick={() => openDrill({ tipoMovimento: 'OPEX', categoria: c.categoria }, `OPEX — ${c.categoria}`)} className="w-full text-left group">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 text-content">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: paletteColor(i) }} />
                        {c.categoria}
                      </span>
                      <span className="font-semibold text-content tabular-nums">{formatCurrency(c.valor, true)}</span>
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

        <Card padding="md">
          <CardHeader title="Por centro de custo" subtitle="Top 10 centros por valor" />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Centro', 'Valor', 'Lançamentos'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porCentro.map((c) => (
                    <tr
                      key={c.centroCusto}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ tipoMovimento: 'OPEX', centroCusto: c.centroCusto }, `OPEX — ${c.centroCusto}`)}
                    >
                      <td className="px-3 py-2 text-content whitespace-nowrap">{c.centroCusto}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-content whitespace-nowrap">{formatCurrency(c.valor, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{c.count}</td>
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

export default OpexPage;
