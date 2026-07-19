import { useMemo, useState } from 'react';
import { Package, Boxes, AlertTriangle, TrendingDown } from 'lucide-react';
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

const ESTOQUE_CATEGORIAS = ['Mercadorias', 'Insumos', 'Materiais', 'Embalagens'];
const ESTOQUE_MINIMO = 50;

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

function deterministicValue(seed: number, min: number, max: number): number {
  const r = (Math.sin(seed * 999) + 1) / 2;
  return Math.round(min + r * (max - min));
}

export function EstoquePage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const itens = useMemo(() => {
    const empresasSet = new Set(filtered.map((r) => r.empresa));
    const empresas = empresasSet.size > 0 ? Array.from(empresasSet) : ['Matriz'];
    const baseSeed = (filters.ano ?? 2025) * 100 + (filters.mes ?? 7);

    return empresas.flatMap((empresa, ei) =>
      ESTOQUE_CATEGORIAS.flatMap((categoria, ci) => {
        const itemCount = deterministicValue(baseSeed + ei * 7 + ci * 13, 3, 8);
        return Array.from({ length: itemCount }, (_, ii) => {
          const seed = baseSeed + ei * 100 + ci * 50 + ii;
          const quantidade = deterministicValue(seed, 5, 500);
          const minimo = deterministicValue(seed + 1, ESTOQUE_MINIMO, 200);
          const unitario = deterministicValue(seed + 2, 10, 5000);
          return {
            id: `${empresa}-${categoria}-${ii}`,
            empresa,
            categoria,
            item: `${categoria.slice(0, 3).toUpperCase()}-${String(ii + 1).padStart(3, '0')}`,
            quantidade,
            minimo,
            unitario,
            valor: quantidade * unitario,
            status: quantidade <= minimo * 0.5 ? 'critico' : quantidade <= minimo ? 'baixo' : 'ok',
            giro: deterministicValue(seed + 3, 1, 12),
          };
        });
      })
    );
  }, [filtered, filters]);

  const totals = useMemo(() => {
    const valorTotal = itens.reduce((a, i) => a + i.valor, 0);
    const quantidadeTotal = itens.reduce((a, i) => a + i.quantidade, 0);
    const baixos = itens.filter((i) => i.status === 'baixo').length;
    const criticos = itens.filter((i) => i.status === 'critico').length;
    return { valorTotal, quantidadeTotal, baixos, criticos, alertas: baixos + criticos };
  }, [itens]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const prev = totals.valorTotal * 0.9;
    return {
      valor: buildKpi(totals.valorTotal, prev, sparkFor(records, (r) => r.reduce((a, x) => a + Math.abs(x.valor) * (x.quantidade ?? 1), 0), filters.ano), true, itens.length === 0),
      itens: buildKpi(itens.length, itens.length * 0.95, sparkFor(records, (r) => r.length, filters.ano), true, itens.length === 0),
      alertas: buildKpi(totals.alertas, totals.alertas + 2, sparkFor(records, (r) => Math.max(0, 15 - r.length % 10), filters.ano), false, itens.length === 0),
      giroMedio: buildKpi(itens.length > 0 ? itens.reduce((a, i) => a + i.giro, 0) / itens.length : 0, 6, sparkFor(records, (r) => 4 + (r.length % 5), filters.ano), true, itens.length === 0),
    };
  }, [records, totals, itens, filters]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { valor: number; quantidade: number; count: number; baixos: number }>();
    itens.forEach((i) => {
      const cur = map.get(i.categoria) ?? { valor: 0, quantidade: 0, count: 0, baixos: 0 };
      cur.valor += i.valor;
      cur.quantidade += i.quantidade;
      cur.count += 1;
      if (i.status !== 'ok') cur.baixos += 1;
      map.set(i.categoria, cur);
    });
    return Array.from(map.entries()).map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.valor - a.valor);
  }, [itens]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  const statusTone = (s: string): Status => s === 'ok' ? 'success' : s === 'baixo' ? 'warning' : 'danger';
  const statusLabel = (s: string): string => s === 'ok' ? 'OK' : s === 'baixo' ? 'Baixo' : 'Crítico';

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Estoque"
        subtitle="Saldo por item, giro, valorização e alertas de estoque baixo."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de estoque">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Valor em Estoque" icon={Package} kpi={kpis.valor} />
              <KpiCard index={1} label="Itens" icon={Boxes} kpi={kpis.itens} />
              <KpiCard index={2} label="Alertas" icon={AlertTriangle} kpi={kpis.alertas} higherIsBetter={false} />
              <KpiCard index={3} label="Giro Médio" icon={TrendingDown} kpi={kpis.giroMedio} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="lg:col-span-1">
          <CardHeader title="Por categoria" subtitle="Valor e quantidade" />
          {isLoading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : (
            <div className="space-y-3 pt-1">
              {porCategoria.map((c, i) => {
                const max = porCategoria[0]?.valor ?? 1;
                const pct = (c.valor / max) * 100;
                return (
                  <div key={c.categoria}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 text-content">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: paletteColor(i) }} />
                        {c.categoria}
                      </span>
                      <span className="font-semibold text-content tabular-nums">{formatCurrency(c.valor, true)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-content-muted/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: paletteColor(i) }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-content-muted">
                      <span>{formatNumber(c.quantidade)} un.</span>
                      <span>{c.count} itens</span>
                      {c.baixos > 0 && <Badge tone="warning">{c.baixos} baixos</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <CardHeader title="Inventário" subtitle="Itens em estoque por empresa" action={<Badge tone="info">{itens.length} itens</Badge>} />
          {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : itens.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-content-muted">Sem dados de estoque para os filtros selecionados.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border-subtle max-h-[380px]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface sticky top-0">
                  <tr>
                    {['Item', 'Empresa', 'Categoria', 'Qtd', 'Mínimo', 'Unitário', 'Total', 'Giro', 'Status'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle whitespace-nowrap ${i >= 3 && i <= 6 ? 'text-right' : i === 8 ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it) => (
                    <tr
                      key={it.id}
                      className={`border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer ${it.status === 'critico' ? 'bg-danger/5' : ''}`}
                      onClick={() => openDrill({ empresa: it.empresa, categoria: it.categoria }, `Estoque — ${it.item}`)}
                    >
                      <td className="px-3 py-2 text-content whitespace-nowrap font-medium">{it.item}</td>
                      <td className="px-3 py-2 text-content-muted whitespace-nowrap">{it.empresa}</td>
                      <td className="px-3 py-2 text-content-muted whitespace-nowrap">{it.categoria}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${it.status !== 'ok' ? 'font-bold text-warning' : 'text-content'}`}>{formatNumber(it.quantidade)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatNumber(it.minimo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(it.unitario, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-content whitespace-nowrap">{formatCurrency(it.valor, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content whitespace-nowrap">{it.giro}x</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap"><Badge tone={statusTone(it.status)}>{statusLabel(it.status)}</Badge></td>
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

export default EstoquePage;
