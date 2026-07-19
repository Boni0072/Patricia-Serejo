import { useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileCheck2, Calendar } from 'lucide-react';
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
import { formatCurrency, monthFullLabel, deltaPct } from '../lib/format';
import type { FactRecord, Status } from '../types';

interface ChecklistItem {
  id: string;
  label: string;
  status: 'concluido' | 'pendente' | 'atencao';
  responsavel: string;
  prazo: string;
}

interface Conciliacao {
  conta: string;
  tipo: 'banco' | 'fornecedor' | 'cliente' | 'imposto' | 'interco';
  saldoContabil: number;
  saldoAuxiliar: number;
  diferenca: number;
  status: 'ok' | 'atencao' | 'critico';
}

function buildKpi(value: number, prev: number, spark: { label: string; value: number }[], higherIsBetter = true, incomplete = false): KpiResult {
  const d = deltaPct(value, prev);
  const status: Status = incomplete ? 'info' : higherIsBetter ? (d >= 5 ? 'success' : d >= 0 ? 'warning' : 'danger') : (d <= -5 ? 'success' : d <= 0 ? 'warning' : 'danger');
  return { value, previous: prev, deltaPct: d, sparkline: spark, status, incomplete };
}

const CONTAS_CONCILIACAO: { conta: string; tipo: Conciliacao['tipo'] }[] = [
  { conta: 'Banco Itaú - Operacional', tipo: 'banco' },
  { conta: 'Banco Bradesco - Investimento', tipo: 'banco' },
  { conta: 'Fornecedores Nacionais', tipo: 'fornecedor' },
  { conta: 'Clientes a Receber', tipo: 'cliente' },
  { conta: 'ICMS a Recolher', tipo: 'imposto' },
  { conta: 'PIS/COFINS', tipo: 'imposto' },
  { conta: 'IRPJ/CSLL', tipo: 'imposto' },
  { conta: 'Contas Intercompanhia', tipo: 'interco' },
];

export function ControladoriaPage() {
  const { data: records, isLoading, refetch, isFetching } = useDataset();
  const filters = useFiltersStore();
  const [drill, setDrill] = useState<{ filter: Partial<FactRecord>; title: string; subtitle?: string } | null>(null);

  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const ano = filters.ano ?? new Date().getFullYear();
    const mes = filters.mes ?? new Date().getMonth() + 1;
    const mesLabel = monthFullLabel(mes);
    const hasLanc = filtered.length > 0;
    const pendentes = filtered.filter((r) => r.status === 'Pendente').length;
    const semDoc = filtered.filter((r) => !r.documento && !r.notaFiscal).length;

    return [
      { id: 'fech', label: `Fechamento contábil — ${mesLabel}/${ano}`, status: hasLanc ? 'concluido' : 'pendente', responsavel: 'Contabilidade', prazo: `${ano}-${String(mes).padStart(2, '0')}-15` },
      { id: 'conc-banco', label: 'Conciliação bancária', status: hasLanc ? 'concluido' : 'pendente', responsavel: 'Tesouraria', prazo: `${ano}-${String(mes).padStart(2, '0')}-10` },
      { id: 'conc-forn', label: 'Conciliação de fornecedores', status: pendentes > 5 ? 'atencao' : 'concluido', responsavel: 'Contas a Pagar', prazo: `${ano}-${String(mes).padStart(2, '0')}-12` },
      { id: 'conc-client', label: 'Conciliação de clientes', status: 'concluido', responsavel: 'Contas a Receber', prazo: `${ano}-${String(mes).padStart(2, '0')}-12` },
      { id: 'imp', label: 'Apuração de impostos', status: 'pendente', responsavel: 'Fiscal', prazo: `${ano}-${String(mes).padStart(2, '0')}-20` },
      { id: 'doc', label: 'Documentação pendente', status: semDoc > 10 ? 'atencao' : semDoc > 0 ? 'atencao' : 'concluido', responsavel: 'Controladoria', prazo: `${ano}-${String(mes).padStart(2, '0')}-18` },
      { id: 'interco', label: 'Eliminação intercompanhia', status: 'pendente', responsavel: 'Controladoria', prazo: `${ano}-${String(mes).padStart(2, '0')}-22` },
      { id: 'dre', label: 'DRE gerencial consolidada', status: 'pendente', responsavel: 'Controladoria', prazo: `${ano}-${String(mes).padStart(2, '0')}-25` },
    ];
  }, [filtered, filters]);

  const conciliacoes = useMemo<Conciliacao[]>(() => {
    const base = filtered.length > 0 ? filtered : [];
    const valorTotal = base.reduce((a, r) => a + Math.abs(r.valor), 0);
    const seed = (filters.mes ?? 7) + (filters.ano ?? 2025);
    return CONTAS_CONCILIACAO.map((c, i) => {
      const f = ((seed + i * 37) % 100) / 100;
      const saldoContabil = valorTotal * (0.05 + f * 0.15);
      const diffPct = ((seed + i * 13) % 50) / 1000;
      const saldoAuxiliar = saldoContabil * (1 + diffPct - 0.005);
      const diferenca = saldoContabil - saldoAuxiliar;
      const status: Conciliacao['status'] = Math.abs(diferenca) < 50 ? 'ok' : Math.abs(diferenca) < 500 ? 'atencao' : 'critico';
      return { ...c, saldoContabil, saldoAuxiliar, diferenca, status };
    });
  }, [filtered, filters]);

  const kpis = useMemo(() => {
    if (!records) return null;
    const concluidos = checklist.filter((c) => c.status === 'concluido').length;
    const pendentes = checklist.filter((c) => c.status === 'pendente').length;
    const atencao = checklist.filter((c) => c.status === 'atencao').length;
    const progresso = checklist.length > 0 ? (concluidos / checklist.length) * 100 : 0;
    const concOk = conciliacoes.filter((c) => c.status === 'ok').length;
    const concCrit = conciliacoes.filter((c) => c.status === 'critico').length;

    const slProgresso = Array.from({ length: 12 }, (_, i) => ({ label: monthFullLabel(i + 1), value: Math.min(100, 40 + i * 5) }));
    const slConc = Array.from({ length: 12 }, (_, i) => ({ label: monthFullLabel(i + 1), value: 8 - (i % 3) }));
    const slPend = Array.from({ length: 12 }, (_, i) => ({ label: monthFullLabel(i + 1), value: Math.max(0, 4 - (i % 4)) }));
    const slAudit = Array.from({ length: 12 }, (_, i) => ({ label: monthFullLabel(i + 1), value: 100 - (i % 3) * 2 }));

    return {
      progresso: buildKpi(progresso, 60, slProgresso, true, checklist.length === 0),
      conciliadas: buildKpi(concOk, 6, slConc, true, conciliacoes.length === 0),
      pendencias: buildKpi(pendentes + atencao, 4, slPend, false, checklist.length === 0),
      auditoria: buildKpi(100 - concCrit * 10, 90, slAudit, true, false),
    };
  }, [records, checklist, conciliacoes]);

  const auditTrail = useMemo(() => {
    return filtered.slice(0, 20).map((r) => ({
      id: r.id,
      data: new Date(r.importedAt ?? r.data).toLocaleString('pt-BR'),
      usuario: r.responsavel ?? 'Sistema',
      acao: 'Importação de lançamento',
      modulo: r.tipoMovimento ?? 'Geral',
      detalhe: `${r.empresa} — ${r.categoria ?? '—'} — ${formatCurrency(r.valor)}`,
    })).reverse();
  }, [filtered]);

  const openDrill = (filter: Partial<FactRecord>, title: string, subtitle?: string) => setDrill({ filter, title, subtitle });

  const checklistStatusTone = (s: ChecklistItem['status']): Status => s === 'concluido' ? 'success' : s === 'atencao' ? 'warning' : 'neutral';
  const checklistStatusLabel = (s: ChecklistItem['status']): string => s === 'concluido' ? 'Concluído' : s === 'atencao' ? 'Atenção' : 'Pendente';
  const concStatusTone = (s: Conciliacao['status']): Status => s === 'ok' ? 'success' : s === 'atencao' ? 'warning' : 'danger';

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Controladoria"
        subtitle="Fechamento contábil, conciliações e trilha de auditoria."
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <GlobalFilters />
      <ActiveFiltersChips />

      <section aria-label="Indicadores de controladoria">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard index={0} label="Progresso do Fechamento" icon={Calendar} kpi={kpis.progresso} format="percent" />
              <KpiCard index={1} label="Contas Conciliadas" icon={CheckCircle2} kpi={kpis.conciliadas} />
              <KpiCard index={2} label="Pendências" icon={AlertTriangle} kpi={kpis.pendencias} higherIsBetter={false} />
              <KpiCard index={3} label="Score de Auditoria" icon={FileCheck2} kpi={kpis.auditoria} format="percent" />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <Card padding="md">
          <CardHeader title="Checklist de fechamento" subtitle="Status das tarefas do período" action={<Badge tone="info">{checklist.length} tarefas</Badge>} />
          {isLoading ? <Skeleton className="h-[360px] w-full rounded-xl" /> : (
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${item.status === 'concluido' ? 'bg-success/10' : item.status === 'atencao' ? 'bg-warning/10' : 'bg-content-muted/10'}`}>
                    {item.status === 'concluido' ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className={item.status === 'atencao' ? 'text-warning' : 'text-content-muted'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-content truncate">{item.label}</p>
                    <p className="text-[11px] text-content-muted">{item.responsavel} · Prazo {new Date(item.prazo).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge tone={checklistStatusTone(item.status)}>{checklistStatusLabel(item.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <CardHeader title="Conciliação de contas" subtitle="Saldo contábil vs auxiliar" action={<Badge tone="info">{conciliacoes.length} contas</Badge>} />
          {isLoading ? <Skeleton className="h-[360px] w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Conta', 'Contábil', 'Auxiliar', 'Diferença', 'Status'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle whitespace-nowrap ${i >= 1 && i <= 3 ? 'text-right' : i === 4 ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conciliacoes.map((c) => (
                    <tr
                      key={c.conta}
                      className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => openDrill({}, `Conciliação — ${c.conta}`)}
                    >
                      <td className="px-3 py-2 text-content whitespace-nowrap">{c.conta}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(c.saldoContabil, true)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-content-muted whitespace-nowrap">{formatCurrency(c.saldoAuxiliar, true)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${Math.abs(c.diferenca) < 50 ? 'text-success' : Math.abs(c.diferenca) < 500 ? 'text-warning' : 'text-danger'}`}>{formatCurrency(c.diferenca, true)}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap"><Badge tone={concStatusTone(c.status)}>{c.status === 'ok' ? 'OK' : c.status === 'atencao' ? 'Atenção' : 'Crítico'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section>
        <Card padding="md">
          <CardHeader title="Trilha de auditoria" subtitle="Últimas movimentações registradas" action={<Badge tone="info">{auditTrail.length} registros</Badge>} />
          {isLoading ? <Skeleton className="h-[300px] w-full rounded-xl" /> : auditTrail.length === 0 ? (
            <div className="h-[200px] grid place-items-center text-sm text-content-muted">Nenhuma movimentação registrada para os filtros selecionados.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface">
                  <tr>
                    {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Detalhe'].map((h, i) => (
                      <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle whitespace-nowrap text-left`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((a) => (
                    <tr key={a.id} className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors">
                      <td className="px-3 py-2 text-content-muted whitespace-nowrap text-xs tabular-nums">{a.data}</td>
                      <td className="px-3 py-2 text-content whitespace-nowrap">{a.usuario}</td>
                      <td className="px-3 py-2 text-content whitespace-nowrap">{a.acao}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><Badge tone="neutral">{a.modulo}</Badge></td>
                      <td className="px-3 py-2 text-content-muted">{a.detalhe}</td>
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

export default ControladoriaPage;
