import { useMemo, useState } from 'react';
import { ShoppingCart, Truck, Clock, DollarSign } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, monthLabel, deltaPct } from '../lib/format';
import { paletteColor } from '../lib/chartColors';
import type { FactRecord, Status } from '../types';

const FORNECEDORES_BLOQUEADOS = ['EnergiaMais', 'HardwarePro', 'InsumosBR'];

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

export function ComprasPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const comprasRecords = useMemo(() => filtered.filter((r) => r.fornecedor), [filtered]);

  const totals = useMemo(() => {
    const valor = comprasRecords.reduce((a, r) => a + Math.abs(r.valor), 0);
    const pendentes = comprasRecords.filter((r) => r.status === 'Pendente').length;
    const aprovados = comprasRecords.filter((r) => r.status === 'Aprovado').length;
    const fornecedores = new Set(comprasRecords.map((r) => r.fornecedor)).size;
    return { valor, pendentes, aprovados, fornecedores };
  }, [comprasRecords]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();
    const prevRecords = records.filter((r) => filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1));
    const prevCompras = prevRecords.filter((r) => r.fornecedor);
    const prevValor = prevCompras.reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevPend = prevCompras.filter((r) => r.status === 'Pendente').length;
    const prevForn = new Set(prevCompras.map((r) => r.fornecedor)).size;

    return {
      volume: buildKpi(totals.valor, prevValor, sparkFor(records, (r) => r.filter((x) => x.fornecedor).reduce((a, x) => a + Math.abs(x.valor), 0), filters.ano), false, totals.valor === 0),
      pendentes: buildKpi(totals.pendentes, prevPend, sparkFor(records, (r) => r.filter((x) => x.fornecedor && x.status === 'Pendente').length, filters.ano), false, comprasRecords.length === 0),
      fornecedores: buildKpi(totals.fornecedores, prevForn, sparkFor(records, (r) => new Set(r.filter((x) => x.fornecedor).map((x) => x.fornecedor)).size, filters.ano), true, comprasRecords.length === 0),
      ticket: buildKpi(comprasRecords.length > 0 ? totals.valor / comprasRecords.length : 0, prevCompras.length > 0 ? prevValor / prevCompras.length : 0, sparkFor(records, (r) => {
        const recs = r.filter((x) => x.fornecedor);
        return recs.length > 0 ? recs.reduce((a, x) => a + Math.abs(x.valor), 0) / recs.length : 0;
      }, filters.ano), true, comprasRecords.length === 0),
    };
  }, [records, totals, comprasRecords.length, filters]);

  const porFornecedor = useMemo(() => {
    const map = new Map<string, { valor: number; count: number; pendentes: number }>();
    comprasRecords.forEach((r) => {
      const cur = map.get(r.fornecedor!) ?? { valor: 0, count: 0, pendentes: 0 };
      cur.valor += Math.abs(r.valor);
      cur.count += 1;
      if (r.status === 'Pendente') cur.pendentes += 1;
      map.set(r.fornecedor!, cur);
    });
    return Array.from(map.entries()).map(([fornecedor, v]) => ({
      fornecedor, ...v, ticket: v.valor / v.count, bloqueado: FORNECEDORES_BLOQUEADOS.includes(fornecedor),
    })).sort((a, b) => b.valor - a.valor);
  }, [comprasRecords]);

  const columns = useMemo<DataTableColumn[]>(() => [
    { key: 'data', header: 'Data', render: (r) => new Date(r.data).toLocaleDateString('pt-BR'), width: 110 },
    { key: 'fornecedor', header: 'Fornecedor', width: 160 },
    { key: 'empresa', header: 'Empresa', width: 120 },
    { key: 'categoria', header: 'Categoria', width: 140 },
    { key: 'documento', header: 'Documento', render: (r) => r.documento ?? r.notaFiscal ?? '—', width: 120 },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Aprovado' ? 'success' : r.status === 'Pendente' ? 'warning' : 'neutral'}>{r.status}</Badge>, width: 110 },
    { key: 'valor', header: 'Valor', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{formatCurrency(Math.abs(r.valor))}</span>, width: 130 },
  ], []);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Compras"
        subtitle="Gestão de fornecedores, pedidos de compra e aprovações."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de compras">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Volume de Compras" icon={ShoppingCart} kpi={kpis.volume} higherIsBetter={false} onClick={() => openDrill({}, 'Compras — detalhamento')} />
              <KpiCard index={1} label="Pendentes de Aprovação" icon={Clock} kpi={kpis.pendentes} higherIsBetter={false} />
              <KpiCard index={2} label="Fornecedores Ativos" icon={Truck} kpi={kpis.fornecedores} />
              <KpiCard index={3} label="Ticket Médio" icon={DollarSign} kpi={kpis.ticket} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="lg:col-span-1">
          <CardHeader title="Top fornecedores" subtitle="Por volume de compras" action={<Badge tone="info">{porFornecedor.length}</Badge>} />
          {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : (
            <div className="space-y-2.5 pt-1 max-h-[340px] overflow-y-auto">
              {porFornecedor.slice(0, 12).map((f, i) => {
                const max = porFornecedor[0]?.valor ?? 1;
                const pct = (f.valor / max) * 100;
                return (
                  <button key={f.fornecedor} onClick={() => openDrill({ fornecedor: f.fornecedor }, `Compras — ${f.fornecedor}`)} className="w-full text-left group">
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="flex items-center gap-1.5 text-content truncate">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: paletteColor(i) }} />
                        {f.fornecedor}
                        {f.bloqueado && <Badge tone="danger">bloqueado</Badge>}
                      </span>
                      <span className="font-semibold text-content tabular-nums shrink-0">{formatCurrency(f.valor, true)}</span>
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

        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader title="Pedidos de compra" subtitle="Lançamentos com fornecedor" action={<Badge tone="info">{comprasRecords.length} registros</Badge>} />
            {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : (
              <DataTable data={comprasRecords} columns={columns} virtualize height={380} exportName="compras" />
            )}
          </Card>
        </div>
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

export default ComprasPage;
