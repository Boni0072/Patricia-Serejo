import { useMemo, useState } from 'react';
import { Building2, TrendingDown, Boxes, Percent } from 'lucide-react';
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
import { formatCurrency, formatNumber, formatPercent, deltaPct, monthLabel } from '../lib/format';
import { paletteColor } from '../lib/chartColors';
import type { FactRecord, Status } from '../types';

interface AtivoRow {
  id: string;
  descricao: string;
  empresa: string;
  categoria: string;
  dataAquisicao: string;
  valorAquisicao: number;
  vidaUtilMeses: number;
  depreciacaoAcumulada: number;
  valorLiquido: number;
  depreciationMensal: number;
  status: 'ativo' | 'baixado';
}

const ATIVOS_DESC = [
  { desc: 'Servidor Dell PowerEdge', cat: 'TI' },
  { desc: 'Caminhão Volkswagen 17120', cat: 'Frota' },
  { desc: 'Empilhadeira Toyota 2.5T', cat: 'Equipamentos' },
  { desc: 'Sistema ERP Licença', cat: 'Software' },
  { desc: 'Balança Industrial Toledo', cat: 'Equipamentos' },
  { desc: 'Móveis Corporativos', cat: 'Mobiliário' },
  { desc: 'Ar Condicionado Split 60k', cat: 'Instalações' },
  { desc: 'Notebook Dell Latitude', cat: 'TI' },
  { desc: 'Gerador 100kVA', cat: 'Instalações' },
  { desc: 'Esteira Transportadora', cat: 'Equipamentos' },
];

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

function deterministicValue(seed: number, min: number, max: number): number {
  const r = (Math.sin(seed * 999) + 1) / 2;
  return Math.round(min + r * (max - min));
}

function sparkFor(records: FactRecord[], picker: (r: FactRecord[]) => number, ano?: number) {
  const out: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ label: monthLabel(m), value: picker(records.filter((r) => r.mes === m && (ano == null || r.ano === ano))) });
  }
  return out;
}

export function ImobilizadoPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const ativos = useMemo<AtivoRow[]>(() => {
    const empresasSet = new Set(filtered.map((r) => r.empresa));
    const empresas = empresasSet.size > 0 ? Array.from(empresasSet) : ['Matriz'];
    const anoBase = filters.ano ?? 2025;
    const baseSeed = anoBase * 100 + (filters.mes ?? 7);

    return empresas.flatMap((empresa, ei) =>
      ATIVOS_DESC.map((a, ai) => {
        const seed = baseSeed + ei * 200 + ai;
        const valorAquisicao = deterministicValue(seed, 15000, 800000);
        const vidaUtilMeses = deterministicValue(seed + 1, 36, 120);
        const mesesDecorridos = deterministicValue(seed + 2, 0, vidaUtilMeses);
        const depreciationMensal = valorAquisicao / vidaUtilMeses;
        const depreciacaoAcumulada = Math.min(valorAquisicao, depreciationMensal * mesesDecorridos);
        const valorLiquido = valorAquisicao - depreciacaoAcumulada;
        const anoAq = anoBase - Math.floor(mesesDecorridos / 12);
        const mesAq = ((12 - (mesesDecorridos % 12)) % 12) + 1;
        return {
          id: `${empresa}-${ai}`,
          descricao: a.desc,
          empresa,
          categoria: a.cat,
          dataAquisicao: `${anoAq}-${String(mesAq).padStart(2, '0')}-15`,
          valorAquisicao,
          vidaUtilMeses,
          depreciacaoAcumulada,
          valorLiquido,
          depreciationMensal,
          status: valorLiquido < 100 ? 'baixado' : 'ativo',
        };
      })
    );
  }, [filtered, filters]);

  const totals = useMemo(() => {
    const valorAquisicao = ativos.reduce((a, x) => a + x.valorAquisicao, 0);
    const depreciacaoAcumulada = ativos.reduce((a, x) => a + x.depreciacaoAcumulada, 0);
    const valorLiquido = ativos.reduce((a, x) => a + x.valorLiquido, 0);
    const depMensal = ativos.reduce((a, x) => a + x.depreciationMensal, 0);
    return { valorAquisicao, depreciacaoAcumulada, valorLiquido, depMensal };
  }, [ativos]);

  const kpis = useMemo(() => {
    if (!records) return null;
    return {
      valorLiquido: buildKpi(totals.valorLiquido, totals.valorLiquido * 1.05, sparkFor(records, (r) => r.reduce((a, x) => a + (x.imobilizado ? Math.abs(x.valor) - Math.abs(x.depreciacao ?? 0) : 0), 0), filters.ano), true, ativos.length === 0),
      aquisicao: buildKpi(totals.valorAquisicao, totals.valorAquisicao * 0.98, sparkFor(records, (r) => r.reduce((a, x) => a + (x.imobilizado ? Math.abs(x.valor) : 0), 0), filters.ano), true, ativos.length === 0),
      depreciacao: buildKpi(totals.depMensal, totals.depMensal * 1.02, sparkFor(records, (r) => r.reduce((a, x) => a + Math.abs(x.depreciacao ?? 0), 0), filters.ano), false, ativos.length === 0),
      ativos: buildKpi(ativos.filter((a) => a.status === 'ativo').length, ativos.length, sparkFor(records, (r) => Math.max(1, r.filter((x) => x.imobilizado).length), filters.ano), true, ativos.length === 0),
    };
  }, [records, totals, ativos, filters]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { aquisicao: number; liquido: number; count: number }>();
    ativos.forEach((a) => {
      const cur = map.get(a.categoria) ?? { aquisicao: 0, liquido: 0, count: 0 };
      cur.aquisicao += a.valorAquisicao;
      cur.liquido += a.valorLiquido;
      cur.count += 1;
      map.set(a.categoria, cur);
    });
    return Array.from(map.entries()).map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.liquido - a.liquido);
  }, [ativos]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  const statusTone = (s: AtivoRow['status']): Status => s === 'ativo' ? 'success' : 'neutral';

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Imobilizado"
        subtitle="Ativos imobilizados, depreciação acumulada e valor líquido contábil."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de imobilizado">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Valor Líquido" icon={Building2} kpi={kpis.valorLiquido} />
              <KpiCard index={1} label="Aquisição Total" icon={Boxes} kpi={kpis.aquisicao} />
              <KpiCard index={2} label="Depreciação Mensal" icon={TrendingDown} kpi={kpis.depreciacao} higherIsBetter={false} />
              <KpiCard index={3} label="Ativos Ativos" icon={Percent} kpi={kpis.ativos} />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="lg:col-span-1">
          <CardHeader title="Por categoria" subtitle="Aquisição e valor líquido" />
          {isLoading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : (
            <div className="space-y-3 pt-1">
              {porCategoria.map((c, i) => {
                const max = porCategoria[0]?.aquisicao ?? 1;
                const pct = (c.aquisicao / max) * 100;
                const deprecPct = c.aquisicao > 0 ? ((c.aquisicao - c.liquido) / c.aquisicao) * 100 : 0;
                return (
                  <div key={c.categoria}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 text-content">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: paletteColor(i) }} />
                        {c.categoria}
                      </span>
                      <span className="font-semibold text-content tabular-nums">{formatCurrency(c.liquido, true)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-content-muted/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: paletteColor(i) }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-content-muted">
                      <span>{formatCurrency(c.aquisicao, true)} aquisição</span>
                      <span>{formatPercent(deprecPct)} deprec.</span>
                      <span>{c.count} ativos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <CardHeader title="Cadastro de ativos" subtitle="Valor, depreciação e vida útil" action={<Badge tone="info">{ativos.length} ativos</Badge>} />
          {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : ativos.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-content-muted">Sem ativos para os filtros selecionados.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border-subtle max-h-[380px]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface sticky top-0">
                  <tr>
                    {['Ativo', 'Empresa', 'Aquisição', 'Dep. Acumulada', 'Líquido', 'Vida útil', 'Status'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle whitespace-nowrap ${i >= 2 && i <= 4 ? 'text-right' : i === 6 ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ativos.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ empresa: a.empresa }, `Ativo — ${a.descricao}`)}
                    >
                      <td className="px-3 py-2 text-content whitespace-nowrap font-medium">{a.descricao}</td>
                      <td className="px-3 py-2 text-content-muted whitespace-nowrap">{a.empresa}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(a.valorAquisicao, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-danger whitespace-nowrap">{formatCurrency(a.depreciacaoAcumulada, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-content whitespace-nowrap">{formatCurrency(a.valorLiquido, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatNumber(a.vidaUtilMeses)}m</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap"><Badge tone={statusTone(a.status)}>{a.status === 'ativo' ? 'Ativo' : 'Baixado'}</Badge></td>
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

export default ImobilizadoPage;
