import { useMemo, useState } from 'react';
import { TrendingUp, Percent, PiggyBank, Scale } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { ResultadoWaterfall, type WaterfallStep } from '../components/charts/ResultadoCharts';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, type KpiResult } from '../lib/kpi';
import { formatCurrency, monthLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

const COGS_CATEGORIAS = ['Logística', 'Energia', 'Manutenção', 'Tributos'];

interface DreLine {
  label: string;
  value: number;
  kind: 'header' | 'subtotal' | 'deduction' | 'result';
  bold?: boolean;
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

export function ResultadoPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const dre = useMemo(() => {
    const receitaBruta = filtered.filter((r) => r.tipoMovimento === 'RECEITA').reduce((a, r) => a + r.valor, 0);
    const tributos = filtered.filter((r) => r.categoria === 'Tributos').reduce((a, r) => a + Math.abs(r.valor), 0);
    const receitaLiquida = receitaBruta - tributos;
    const cogs = filtered.filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && r.categoria && COGS_CATEGORIAS.includes(r.categoria)).reduce((a, r) => a + Math.abs(r.valor), 0);
    const lucroBruto = receitaLiquida - cogs;
    const despesasOp = filtered.filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && (!r.categoria || !COGS_CATEGORIAS.includes(r.categoria))).reduce((a, r) => a + Math.abs(r.valor), 0);
    const ebitda = lucroBruto - despesasOp;
    const depreciacao = filtered.reduce((a, r) => a + Math.abs(r.depreciacao ?? 0), 0);
    const ebit = ebitda - depreciacao;
    const resultadoFin = -receitaBruta * 0.03;
    const lair = ebit + resultadoFin;
    const ir = lair > 0 ? -lair * 0.34 : 0;
    const lucroLiquido = lair + ir;

    return {
      receitaBruta, tributos, receitaLiquida, cogs, lucroBruto, despesasOp, ebitda,
      depreciacao, ebit, resultadoFin, lair, ir, lucroLiquido,
      margemBruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
      margemEbitda: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
      margemLiquida: receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0,
    };
  }, [filtered]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const ano = filters.ano ?? new Date().getFullYear();
    const prevRecords = records.filter((r) => filters.mes == null ? r.ano === ano - 1 : r.ano === ano && r.mes === (filters.mes === 1 ? 12 : filters.mes - 1));
    const prevReceita = prevRecords.filter((r) => r.tipoMovimento === 'RECEITA').reduce((a, r) => a + r.valor, 0);
    const prevTrib = prevRecords.filter((r) => r.categoria === 'Tributos').reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevRecLiq = prevReceita - prevTrib;
    const prevCogs = prevRecords.filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && r.categoria && COGS_CATEGORIAS.includes(r.categoria)).reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevDespOp = prevRecords.filter((r) => (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') && (!r.categoria || !COGS_CATEGORIAS.includes(r.categoria))).reduce((a, r) => a + Math.abs(r.valor), 0);
    const prevEbitda = (prevRecLiq - prevCogs) - prevDespOp;
    const prevLucro = prevEbitda - (prevReceita * 0.03) * (1 - (prevEbitda > 0 ? 0.34 : 0));

    const slMargemBruta = sparkFor(records, (r) => {
      const rb = r.filter((x) => x.tipoMovimento === 'RECEITA').reduce((a, x) => a + x.valor, 0);
      const tr = r.filter((x) => x.categoria === 'Tributos').reduce((a, x) => a + Math.abs(x.valor), 0);
      const cg = r.filter((x) => (x.tipoMovimento === 'OPEX' || x.tipoMovimento === 'DESPESA') && x.categoria && COGS_CATEGORIAS.includes(x.categoria)).reduce((a, x) => a + Math.abs(x.valor), 0);
      const rl = rb - tr;
      return rl > 0 ? ((rl - cg) / rl) * 100 : 0;
    }, filters.ano);
    const slMargemEbitda = slMargemBruta.map((p, i) => ({ label: p.label, value: p.value }));
    const slMargemLiq = slMargemEbitda.map((p) => ({ ...p }));

    return {
      margemBruta: buildKpi(dre.margemBruta, prevRecLiq > 0 ? ((prevRecLiq - prevCogs) / prevRecLiq) * 100 : 0, slMargemBruta, true, dre.receitaLiquida === 0),
      margemEbitda: buildKpi(dre.margemEbitda, prevRecLiq > 0 ? (prevEbitda / prevRecLiq) * 100 : 0, slMargemEbitda, true, dre.receitaLiquida === 0),
      margemLiquida: buildKpi(dre.margemLiquida, prevRecLiq > 0 ? (prevLucro / prevRecLiq) * 100 : 0, slMargemLiq, true, dre.receitaLiquida === 0),
      ebitda: buildKpi(dre.ebitda, prevEbitda, sparkFor(records, (r) => {
        const rb = r.filter((x) => x.tipoMovimento === 'RECEITA').reduce((a, x) => a + x.valor, 0);
        const cg = r.filter((x) => (x.tipoMovimento === 'OPEX' || x.tipoMovimento === 'DESPESA') && x.categoria && COGS_CATEGORIAS.includes(x.categoria)).reduce((a, x) => a + Math.abs(x.valor), 0);
        const dop = r.filter((x) => (x.tipoMovimento === 'OPEX' || x.tipoMovimento === 'DESPESA') && (!x.categoria || !COGS_CATEGORIAS.includes(x.categoria))).reduce((a, x) => a + Math.abs(x.valor), 0);
        return (rb - cg) - dop;
      }, filters.ano), true, dre.receitaLiquida === 0),
    };
  }, [records, dre, filters]);

  const waterfall = useMemo<WaterfallStep[]>(() => {
    if (filtered.length === 0) return [];
    let running = 0;
    const steps: WaterfallStep[] = [];
    const push = (label: string, value: number, type: 'total' | 'positive' | 'negative') => {
      running += type === 'total' ? 0 : value;
      if (type === 'total') running = value;
      steps.push({ label, value: type === 'total' ? value : value, type, running: type === 'total' ? value : running });
    };
    push('Receita Bruta', dre.receitaBruta, 'total');
    push('Tributos', -dre.tributos, 'negative');
    push('Receita Líq.', dre.receitaLiquida, 'total');
    push('Custos (COGS)', -dre.cogs, 'negative');
    push('Lucro Bruto', dre.lucroBruto, 'total');
    push('Despesas Op.', -dre.despesasOp, 'negative');
    push('EBITDA', dre.ebitda, 'total');
    push('Depreciação', -dre.depreciacao, 'negative');
    push('EBIT', dre.ebit, 'total');
    push('Resultado Fin.', dre.resultadoFin, dre.resultadoFin >= 0 ? 'positive' : 'negative');
    push('IR/CSLL', dre.ir, 'negative');
    push('Lucro Líquido', dre.lucroLiquido, 'total');
    return steps;
  }, [dre, filtered.length]);

  const dreLines = useMemo<DreLine[]>(() => [
    { label: 'Receita Bruta', value: dre.receitaBruta, kind: 'header' },
    { label: '(–) Tributos sobre Receita', value: -dre.tributos, kind: 'deduction' },
    { label: '(=) Receita Líquida', value: dre.receitaLiquida, kind: 'subtotal', bold: true },
    { label: '(–) Custos Operacionais (COGS)', value: -dre.cogs, kind: 'deduction' },
    { label: '(=) Lucro Bruto', value: dre.lucroBruto, kind: 'subtotal', bold: true },
    { label: '(–) Despesas Operacionais (SGA)', value: -dre.despesasOp, kind: 'deduction' },
    { label: '(=) EBITDA', value: dre.ebitda, kind: 'result', bold: true },
    { label: '(–) Depreciação e Amortização', value: -dre.depreciacao, kind: 'deduction' },
    { label: '(=) EBIT', value: dre.ebit, kind: 'subtotal', bold: true },
    { label: '(–/+) Resultado Financeiro', value: dre.resultadoFin, kind: 'deduction' },
    { label: '(=) LAIR', value: dre.lair, kind: 'subtotal', bold: true },
    { label: '(–) IR/CSLL (34%)', value: dre.ir, kind: 'deduction' },
    { label: '(=) Lucro Líquido', value: dre.lucroLiquido, kind: 'result', bold: true },
  ], [dre]);

  const porEmpresa = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number }>();
    filtered.forEach((r) => {
      const cur = map.get(r.empresa) ?? { receita: 0, despesa: 0 };
      if (r.tipoMovimento === 'RECEITA') cur.receita += r.valor;
      else if (r.tipoMovimento === 'OPEX' || r.tipoMovimento === 'DESPESA') cur.despesa += Math.abs(r.valor);
      map.set(r.empresa, cur);
    });
    return Array.from(map.entries()).map(([empresa, v]) => ({
      empresa, ...v, resultado: v.receita - v.despesa,
      margem: v.receita > 0 ? ((v.receita - v.despesa) / v.receita) * 100 : 0,
    })).sort((a, b) => b.resultado - a.resultado);
  }, [filtered]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Resultado"
        subtitle="DRE gerencial, margens e análise de resultado por segmento."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de margem">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="EBITDA" icon={TrendingUp} kpi={kpis.ebitda} onClick={() => openDrill({}, 'EBITDA — detalhamento')} />
              <KpiCard index={1} label="Margem Bruta" icon={Percent} kpi={kpis.margemBruta} format="percent" />
              <KpiCard index={2} label="Margem EBITDA" icon={Scale} kpi={kpis.margemEbitda} format="percent" />
              <KpiCard index={3} label="Margem Líquida" icon={PiggyBank} kpi={kpis.margemLiquida} format="percent" />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <Card padding="md">
          <CardHeader title="DRE Gerencial" subtitle="Demonstração do resultado do exercício" action={<Badge tone="info">estimativa</Badge>} />
          {isLoading ? <Skeleton className="h-[420px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <tbody>
                  {dreLines.map((line) => (
                    <tr
                      key={line.label}
                      className={`border-b border-border-subtle/40 hover:bg-surface-hover transition-colors ${line.kind === 'result' ? 'bg-surface-hover/50' : ''}`}
                    >
                      <td className={`px-3 py-2.5 ${line.bold ? 'font-semibold text-content' : line.kind === 'deduction' ? 'text-content-muted pl-6' : 'text-content'}`}>
                        {line.label}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${line.bold ? 'font-bold text-content' : line.value < 0 ? 'text-danger' : 'text-content'}`}>
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
          <CardHeader title="Waterfall — Bridge para Lucro Líquido" subtitle="Do faturamento ao resultado líquido" />
          {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : <ResultadoWaterfall steps={waterfall} />}
        </Card>
      </section>

      <section>
        <Card padding="md">
          <CardHeader
            title="Resultado por empresa"
            subtitle="Receita, despesa e margem por unidade"
            action={<Badge tone="info">{porEmpresa.length} empresas</Badge>}
          />
          {isLoading ? <Skeleton className="h-[240px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Empresa', 'Receita', 'Despesa', 'Resultado', 'Margem'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-4 py-2.5 border-b border-border-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porEmpresa.map((e) => (
                    <tr
                      key={e.empresa}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({ empresa: e.empresa }, `Resultado — ${e.empresa}`)}
                    >
                      <td className="px-4 py-2.5 text-content whitespace-nowrap">{e.empresa}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success whitespace-nowrap">{formatCurrency(e.receita, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-danger whitespace-nowrap">{formatCurrency(e.despesa, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap ${e.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(e.resultado, true)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${e.margem >= 20 ? 'text-success' : e.margem >= 0 ? 'text-warning' : 'text-danger'}`}>{e.margem.toFixed(1)}%</td>
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

export default ResultadoPage;
