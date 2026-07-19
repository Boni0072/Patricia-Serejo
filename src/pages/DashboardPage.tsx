import { useMemo, useState } from 'react';
import {
  TrendingUp, Wallet, PiggyBank, Percent, Banknote, Coins,
  Target, CheckCircle2, LineChart, Hammer, Boxes, Gauge, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ReceitaLucroChart, BudgetVsRealChart, CapexPorCategoriaChart,
  FluxoCaixaChart, ReceitaPorEmpresaChart, TopFornecedoresChart,
} from '../components/charts/DashboardCharts';
import { ExpandableChart } from '../components/charts/ExpandableChart';
import { AiAnalyst } from '../components/AiAnalyst';
import { AlertsPanel } from '../components/AlertsPanel';
import { DrillDownDrawer } from '../components/DrillDownDrawer';
import { useDataset } from '../hooks/useDataset';
import { useAlertas } from '../hooks/useAlertas';
import { useFiltersStore } from '../store/filters';
import { applyFilters, computeKpis, DEFAULT_THRESHOLDS } from '../lib/kpi';
import type { FactRecord } from '../types';

export function DashboardPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const { alertas } = useAlertas();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const kpis = useMemo(
    () => (records ? computeKpis(records, applyFilters(records, filters), filters, DEFAULT_THRESHOLDS) : null),
    [records, filters],
  );

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Dashboard Executivo"
        subtitle="Visão consolidada de desempenho financeiro, controladoria e operações — KPIs em tempo real com drill-down até o lançamento."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      {/* KPIs */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 10 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Receita" icon={TrendingUp} kpi={kpis.receita} onClick={() => openDrill({ tipoMovimento: 'RECEITA' }, 'Receita — detalhamento')} />
              <KpiCard index={1} label="EBITDA" icon={Wallet} kpi={kpis.ebitda} onClick={() => openDrill({}, 'EBITDA — detalhamento')} />
              <KpiCard index={2} label="Lucro Líquido" icon={PiggyBank} kpi={kpis.lucroLiquido} />
              <KpiCard index={3} label="Margem EBITDA" icon={Percent} kpi={kpis.margemEbitda} format="percent" />
              <KpiCard index={4} label="Fluxo de Caixa" icon={Banknote} kpi={kpis.fluxoCaixa} />
              <KpiCard index={5} label="Capital de Giro" icon={Coins} kpi={kpis.capitalGiro} />
              <KpiCard index={6} label="Budget" icon={Target} kpi={kpis.budget} higherIsBetter />
              <KpiCard index={7} label="Realizado" icon={CheckCircle2} kpi={kpis.realizado} />
              <KpiCard index={8} label="Forecast" icon={LineChart} kpi={kpis.forecast} />
              <KpiCard index={9} label="CAPEX" icon={Hammer} kpi={kpis.capex} higherIsBetter={false} onClick={() => openDrill({ tipoMovimento: 'CAPEX' }, 'CAPEX — detalhamento')} />
              <KpiCard index={10} label="OPEX" icon={Boxes} kpi={kpis.opex} higherIsBetter={false} onClick={() => openDrill({ tipoMovimento: 'OPEX' }, 'OPEX — detalhamento')} />
              <KpiCard index={11} label="ROI" icon={Gauge} kpi={kpis.roi} format="percent" />
              <KpiCard index={12} label="ROIC" icon={BarChart3} kpi={kpis.roic} format="percent" />
            </>
          )}
        </div>
      </section>

      {/* Charts row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        {isLoading ? (
          <Skeleton className="h-[340px] w-full rounded-xl lg:col-span-2" />
        ) : (
          <div className="lg:col-span-2">
            <ExpandableChart title="Receita x Despesa x Lucro" subtitle="Evolução mensal consolidada" compactHeight={280} expandedHeight={520}>
              {(h) => <ReceitaLucroChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
          </div>
        )}
        {isLoading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : <AlertsPanel alertas={alertas} loading={isLoading} />}
      </section>

      {/* Charts row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        {isLoading ? (
          <>
            <Skeleton className="h-[340px] w-full rounded-xl" />
            <Skeleton className="h-[340px] w-full rounded-xl" />
            <Skeleton className="h-[340px] w-full rounded-xl" />
          </>
        ) : (
          <>
            <ExpandableChart title="Budget x Realizado" subtitle="Por centro de custo" compactHeight={280} expandedHeight={460}>
              {(h) => <BudgetVsRealChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
            <ExpandableChart title="CAPEX por Categoria" subtitle="Investimentos por tipo" compactHeight={280} expandedHeight={460}>
              {(h) => <CapexPorCategoriaChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
            <ExpandableChart title="Fluxo de Caixa" subtitle="Entradas, saídas e saldo acumulado" compactHeight={280} expandedHeight={460}>
              {(h) => <FluxoCaixaChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
          </>
        )}
      </section>

      {/* Charts row 3 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </>
        ) : (
          <>
            <ExpandableChart title="Receita por Empresa" subtitle="Ranking de unidades" compactHeight={280} expandedHeight={460}>
              {(h) => <ReceitaPorEmpresaChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
            <ExpandableChart title="Top Fornecedores" subtitle="Maiores volumes pagos" compactHeight={280} expandedHeight={460}>
              {(h) => <TopFornecedoresChart data={filtered} onDrillDown={openDrill} height={h} />}
            </ExpandableChart>
          </>
        )}
      </section>

      <DrillDownDrawer
        open={!!drill}
        onClose={() => setDrill(null)}
        title={drill?.title ?? ''}
        subtitle={drill?.subtitle}
        filter={drill?.filter}
      />

      <AiAnalyst kpis={kpis} filtered={filtered} filters={filters} alertas={alertas} />
    </div>
  );
}
