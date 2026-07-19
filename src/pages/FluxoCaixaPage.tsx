import { useMemo, useState } from 'react';
import { Banknote, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { FluxoCaixaChart } from '../components/charts/DashboardCharts';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, monthLabel, monthFullLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

interface MonthlyRow {
  mes: number;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
  acumulado: number;
}

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

export function FluxoCaixaPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const monthly = useMemo<MonthlyRow[]>(() => {
    const map = new Map<number, { entradas: number; saidas: number }>();
    for (let m = 1; m <= 12; m++) map.set(m, { entradas: 0, saidas: 0 });
    filtered.forEach((r) => {
      const cur = map.get(r.mes);
      if (!cur) return;
      if (r.valor > 0) cur.entradas += r.valor;
      else cur.saidas += Math.abs(r.valor);
    });
    let acc = 0;
    return Array.from(map.entries()).map(([m, v]) => {
      const saldo = v.entradas - v.saidas;
      acc += saldo;
      return { mes: m, label: monthLabel(m), entradas: v.entradas, saidas: v.saidas, saldo, acumulado: acc };
    });
  }, [filtered]);

  const totals = useMemo(() => {
    const entradas = filtered.filter((r) => r.valor > 0).reduce((a, r) => a + r.valor, 0);
    const saidas = filtered.filter((r) => r.valor < 0).reduce((a, r) => a + Math.abs(r.valor), 0);
    const saldo = entradas - saidas;
    return { entradas, saidas, saldo };
  }, [filtered]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();

    const prevRecords = records.filter((r) => filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1));
    const prevEntradas = prevRecords.filter((r) => r.valor > 0).reduce((a, r) => a + r.valor, 0);
    const prevSaidas = prevRecords.filter((r) => r.valor < 0).reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevSaldo = prevEntradas - prevSaidas;

    const sparkEntradas = monthly.map((m) => ({ label: m.label, value: m.entradas }));
    const sparkSaidas = monthly.map((m) => ({ label: m.label, value: m.saidas }));
    const sparkSaldo = monthly.map((m) => ({ label: m.label, value: m.saldo }));
    const sparkAcum = monthly.map((m) => ({ label: m.label, value: m.acumulado }));

    return {
      saldoAtual: buildKpi(monthly.reduce((a, m) => a + m.saldo, 0), prevSaldo, sparkAcum, true, filtered.length === 0),
      entradas: buildKpi(totals.entradas, prevEntradas, sparkEntradas, true, filtered.length === 0),
      saidas: buildKpi(totals.saidas, prevSaidas, sparkSaidas, false, filtered.length === 0),
      saldoPeriodo: buildKpi(totals.saldo, prevSaldo, sparkSaldo, true, filtered.length === 0),
    };
  }, [records, filtered, monthly, totals, filters]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="Entradas, saídas e saldo acumulado por mês — acompanhe a liquidez da operação."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de fluxo de caixa">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Saldo Acumulado" icon={Wallet} kpi={kpis.saldoAtual} />
              <KpiCard index={1} label="Entradas" icon={ArrowUpCircle} kpi={kpis.entradas} onClick={() => openDrill({}, 'Entradas — detalhamento')} />
              <KpiCard index={2} label="Saídas" icon={ArrowDownCircle} kpi={kpis.saidas} higherIsBetter={false} onClick={() => openDrill({}, 'Saídas — detalhamento')} />
              <KpiCard index={3} label="Saldo do Período" icon={Banknote} kpi={kpis.saldoPeriodo} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 mb-5">
        {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : (
          <FluxoCaixaChart data={filtered} onDrillDown={openDrill} />
        )}
      </section>

      <section>
        <Card padding="md">
          <CardHeader
            title="Movimentação mensal"
            subtitle="Entradas, saídas e saldo acumulado por mês"
            action={<Badge tone="info">{filtered.length} lançamentos</Badge>}
          />
          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-xl" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Mês', 'Entradas', 'Saídas', 'Saldo', 'Saldo Acumulado'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-4 py-2.5 border-b border-border-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr
                      key={m.mes}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ mes: m.mes }, `Fluxo de Caixa — ${monthFullLabel(m.mes)}`)}
                    >
                      <td className="px-4 py-2.5 text-content whitespace-nowrap">{monthFullLabel(m.mes)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success whitespace-nowrap">{formatCurrency(m.entradas, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-danger whitespace-nowrap">{formatCurrency(m.saidas, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap ${m.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(m.saldo, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap ${m.acumulado >= 0 ? 'text-content' : 'text-danger'}`}>{formatCurrency(m.acumulado, true)}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-hover font-bold">
                    <td className="px-4 py-3 text-content">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">{formatCurrency(totals.entradas, true)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-danger">{formatCurrency(totals.saidas, true)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${totals.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totals.saldo, true)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content">{formatCurrency(monthly[monthly.length - 1]?.acumulado ?? 0, true)}</td>
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

export default FluxoCaixaPage;
