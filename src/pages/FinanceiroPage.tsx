import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, PiggyBank, Percent } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { ReceitaLucroChart } from '../components/charts/DashboardCharts';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, computeKpis, DEFAULT_THRESHOLDS, type KpiResult } from '../lib/kpi';
import { formatCurrency, monthLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

function sumByTipo(records: FactRecord[], tipos: string[]): number {
  return records.filter((r) => r.tipoMovimento && tipos.includes(r.tipoMovimento)).reduce((a, r) => a + r.valor, 0);
}
function sumAbsByTipo(records: FactRecord[], tipos: string[]): number {
  return records.filter((r) => r.tipoMovimento && tipos.includes(r.tipoMovimento)).reduce((a, r) => a + Math.abs(r.valor), 0);
}

function monthlySpark(records: FactRecord[], picker: (r: FactRecord[]) => number, ano?: number) {
  const out: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const recs = records.filter((r) => r.mes === m && (ano == null || r.ano === ano));
    out.push({ label: monthLabel(m), value: picker(recs) });
  }
  return out;
}

function prevPeriod(records: FactRecord[], f: { ano?: number; mes?: number }, picker: (r: FactRecord[]) => number): number {
  const ano = f.ano ?? new Date().getFullYear();
  const mes = f.mes;
  if (mes != null) {
    const pm = mes === 1 ? 12 : mes - 1;
    const pa = mes === 1 ? ano - 1 : ano;
    return picker(records.filter((r) => r.ano === pa && r.mes === pm));
  }
  return picker(records.filter((r) => r.ano === ano - 1));
}

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

export function FinanceiroPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const base = computeKpis(records, filtered, filters, DEFAULT_THRESHOLDS);
    const receitaCur = sumByTipo(filtered, ['RECEITA']);
    const despesaCur = sumAbsByTipo(filtered, ['OPEX', 'DESPESA']);
    const resultadoCur = receitaCur - despesaCur;
    const margemCur = receitaCur > 0 ? (resultadoCur / receitaCur) * 100 : 0;

    const despesaPrev = prevPeriod(records, filters, (r) => sumAbsByTipo(r, ['OPEX', 'DESPESA']));
    const receitaPrev = prevPeriod(records, filters, (r) => sumByTipo(r, ['RECEITA']));
    const resultadoPrev = receitaPrev - despesaPrev;
    const margemPrev = receitaPrev > 0 ? (resultadoPrev / receitaPrev) * 100 : 0;

    const slDespesa = monthlySpark(records, (r) => sumAbsByTipo(r, ['OPEX', 'DESPESA']), filters.ano);
    const slReceita = monthlySpark(records, (r) => sumByTipo(r, ['RECEITA']), filters.ano);
    const slResultado = slReceita.map((p, i) => ({ label: p.label, value: p.value - slDespesa[i].value }));
    const slMargem = slReceita.map((p, i) => ({ label: p.label, value: p.value > 0 ? ((p.value - slDespesa[i].value) / p.value) * 100 : 0 }));

    return {
      receita: base.receita,
      despesa: buildKpi(despesaCur, despesaPrev, slDespesa, false),
      resultado: buildKpi(resultadoCur, resultadoPrev, slResultado, true),
      margem: buildKpi(margemCur, margemPrev, slMargem, true, receitaCur === 0),
    };
  }, [records, filtered, filters]);

  const financeiroRecords = useMemo(() => filtered.filter((r) => r.tipoMovimento === 'RECEITA' || r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA'), [filtered]);

  const columns = useMemo<DataTableColumn[]>(() => [
    { key: 'data', header: 'Data', render: (r) => new Date(r.data).toLocaleDateString('pt-BR'), width: 110 },
    { key: 'empresa', header: 'Empresa', width: 120 },
    { key: 'categoria', header: 'Categoria', width: 160 },
    { key: 'fornecedor', header: 'Fornecedor/Cliente', render: (r) => r.fornecedor ?? r.cliente ?? '—', width: 150 },
    { key: 'tipoMovimento', header: 'Tipo', render: (r) => <Badge tone={r.tipoMovimento === 'RECEITA' ? 'success' : 'neutral'}>{r.tipoMovimento}</Badge>, width: 100 },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Aprovado' ? 'success' : r.status === 'Pendente' ? 'warning' : 'neutral'}>{r.status}</Badge>, width: 110 },
    { key: 'valor', header: 'Valor', align: 'right', render: (r) => <span className={r.valor >= 0 ? 'text-success font-semibold' : 'text-content'}>{formatCurrency(r.valor)}</span>, width: 130 },
  ], []);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Financeiro"
        subtitle="Receita, despesas, resultado líquido e margem — com drill-down até o lançamento."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      {/* KPIs */}
      <section aria-label="Indicadores financeiros">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Receita" icon={TrendingUp} kpi={kpis.receita} onClick={() => openDrill({ tipoMovimento: 'RECEITA' }, 'Receita — detalhamento')} />
              <KpiCard index={1} label="Despesa" icon={TrendingDown} kpi={kpis.despesa} higherIsBetter={false} onClick={() => openDrill({ tipoMovimento: 'OPEX' }, 'Despesas — detalhamento')} />
              <KpiCard index={2} label="Resultado Líquido" icon={PiggyBank} kpi={kpis.resultado} onClick={() => openDrill({}, 'Resultado Líquido — detalhamento')} />
              <KpiCard index={3} label="Margem" icon={Percent} kpi={kpis.margem} format="percent" />
            </>
          )}
        </div>
      </section>

      {/* Chart */}
      <section className="grid grid-cols-1 gap-3 mb-5">
        {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : (
          <ReceitaLucroChart data={filtered} onDrillDown={openDrill} />
        )}
      </section>

      {/* Tabela de lançamentos financeiros */}
      <section>
        <Card padding="md">
          <CardHeader title="Lançamentos financeiros" subtitle="Receitas e despesas do período filtrado" action={<Badge tone="info">{financeiroRecords.length} registros</Badge>} />
          {isLoading ? <Skeleton className="h-[420px] w-full rounded-xl" /> : (
            <DataTable data={financeiroRecords} columns={columns} virtualize height={480} exportName="financeiro" />
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

export default FinanceiroPage;
