import type { FactRecord, Status } from '../types';
import { deltaPct, monthLabel } from './format';

export interface FilterState {
  empresa?: string;
  loja?: string;
  centroCusto?: string;
  projeto?: string;
  fornecedor?: string;
  categoria?: string;
  ano?: number;
  mes?: number;
  status?: string;
}

export function applyFilters(records: FactRecord[], f: FilterState): FactRecord[] {
  return records.filter((r) => {
    if (f.empresa && r.empresa !== f.empresa) return false;
    if (f.loja && r.loja !== f.loja) return false;
    if (f.centroCusto && r.centroCusto !== f.centroCusto) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.categoria && r.categoria !== f.categoria) return false;
    if (f.ano && r.ano !== f.ano) return false;
    if (f.mes && r.mes !== f.mes) return false;
    if (f.status && r.status !== f.status) return false;
    return true;
  });
}

export interface KpiResult {
  value: number;
  previous: number;
  deltaPct: number;
  sparkline: { label: string; value: number }[];
  incomplete?: boolean;
  status: Status;
}

export interface KpiSet {
  receita: KpiResult;
  ebitda: KpiResult;
  lucroLiquido: KpiResult;
  margemEbitda: KpiResult;
  fluxoCaixa: KpiResult;
  capitalGiro: KpiResult;
  budget: KpiResult;
  realizado: KpiResult;
  forecast: KpiResult;
  capex: KpiResult;
  opex: KpiResult;
  roi: KpiResult;
  roic: KpiResult;
}

function sumByTipo(records: FactRecord[], tipos: string[]): number {
  return records
    .filter((r) => r.tipoMovimento && tipos.includes(r.tipoMovimento))
    .reduce((acc, r) => acc + r.valor, 0);
}

function sumAbsByTipo(records: FactRecord[], tipos: string[]): number {
  return records
    .filter((r) => r.tipoMovimento && tipos.includes(r.tipoMovimento))
    .reduce((acc, r) => acc + Math.abs(r.valor), 0);
}

export interface Thresholds {
  margemEbitda: { good: number; warn: number };
  delta: { good: number; warn: number };
  budgetAdherence: { good: number; warn: number };
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  margemEbitda: { good: 20, warn: 10 },
  delta: { good: 5, warn: 0 },
  budgetAdherence: { good: 95, warn: 80 },
};

function statusFromDelta(delta: number, th: Thresholds): Status {
  if (delta >= th.delta.good) return 'success';
  if (delta >= th.delta.warn) return 'warning';
  return 'danger';
}

function monthlySeries(
  records: FactRecord[],
  picker: (recs: FactRecord[]) => number,
  ano: number | undefined,
): { label: string; value: number }[] {
  const series: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const recs = records.filter((r) => r.mes === m && (ano == null || r.ano === ano));
    series.push({ label: monthLabel(m), value: picker(recs) });
  }
  return series;
}

function currentVsPrevious(
  records: FactRecord[],
  f: FilterState,
  picker: (recs: FactRecord[]) => number,
): { current: number; previous: number } {
  const ano = f.ano ?? new Date().getFullYear();
  const mes = f.mes;
  const current = picker(
    records.filter((r) => r.ano === ano && (mes == null || r.mes === mes)),
  );
  let prevRecords: FactRecord[];
  if (mes != null) {
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    prevRecords = records.filter((r) => r.ano === prevAno && r.mes === prevMes);
  } else {
    prevRecords = records.filter((r) => r.ano === ano - 1);
  }
  const previous = picker(prevRecords);
  return { current, previous };
}

export function computeKpis(
  allRecords: FactRecord[],
  filtered: FactRecord[],
  f: FilterState,
  th: Thresholds = DEFAULT_THRESHOLDS,
): KpiSet {
  const receitaCur = sumByTipo(filtered, ['RECEITA']);
  const { current: receita, previous: receitaPrev } = currentVsPrevious(
    allRecords,
    f,
    (r) => sumByTipo(r, ['RECEITA']),
  );
  const despesasOp = sumAbsByTipo(filtered, ['OPEX', 'DESPESA']);
  const depreciacaoTotal = filtered.reduce(
    (acc, r) => acc + Math.abs(r.depreciacao ?? 0),
    0,
  );
  const ebitda = receitaCur - despesasOp;
  const ebitdaPrev = currentVsPrevious(allRecords, f, (r) => {
    const rec = sumByTipo(r, ['RECEITA']);
    const desp = sumAbsByTipo(r, ['OPEX', 'DESPESA']);
    return rec - desp;
  });
  const margemEbitda = receitaCur > 0 ? (ebitda / receitaCur) * 100 : 0;

  const temJurosImpostos = filtered.some((r) => r.subgrupo === 'Administrativo' && r.categoria === 'Tributos');
  const lucroLiquido = temJurosImpostos ? ebitda - depreciacaoTotal * 0.6 : 0;
  const lucroIncomplete = !temJurosImpostos;

  const capex = sumAbsByTipo(filtered, ['CAPEX']);
  const opex = sumAbsByTipo(filtered, ['OPEX']);
  const { current: capexCur, previous: capexPrev } = currentVsPrevious(
    allRecords,
    f,
    (r) => sumAbsByTipo(r, ['CAPEX']),
  );
  const { current: opexCur, previous: opexPrev } = currentVsPrevious(
    allRecords,
    f,
    (r) => sumAbsByTipo(r, ['OPEX']),
  );

  const budgetTotal = filtered.reduce((acc, r) => acc + (r.budget ?? 0), 0);
  const realizadoTotal = filtered.reduce((acc, r) => acc + (r.realizado ?? 0), 0);
  const forecastTotal = filtered.reduce((acc, r) => acc + (r.forecast ?? 0), 0);
  const budgetAdherence = budgetTotal > 0 ? (Math.abs(realizadoTotal) / budgetTotal) * 100 : 0;

  const fluxoCaixa = receitaCur - despesasOp - capex;
  const capitalGiro = receitaCur * 0.35 - despesasOp * 0.45;

  const investimentoTotal = capex;
  const ganhoEstimado = receitaCur * 0.12;
  const roi = investimentoTotal > 0 ? ((ganhoEstimado - investimentoTotal) / investimentoTotal) * 100 : 0;
  const nopat = ebitda * 0.75;
  const roic = investimentoTotal > 0 ? (nopat / investimentoTotal) * 100 : 0;

  const slReceita = monthlySeries(allRecords, (r) => sumByTipo(r, ['RECEITA']), f.ano);
  const slEbitda = monthlySeries(allRecords, (r) => {
    const rec = sumByTipo(r, ['RECEITA']);
    const desp = sumAbsByTipo(r, ['OPEX', 'DESPESA']);
    return rec - desp;
  }, f.ano);
  const slLucro = monthlySeries(allRecords, (r) => {
    const e = sumByTipo(r, ['RECEITA']) - sumAbsByTipo(r, ['OPEX', 'DESPESA']);
    return e - r.reduce((a, x) => a + Math.abs(x.depreciacao ?? 0), 0) * 0.6;
  }, f.ano);
  const slCapex = monthlySeries(allRecords, (r) => sumAbsByTipo(r, ['CAPEX']), f.ano);
  const slOpex = monthlySeries(allRecords, (r) => sumAbsByTipo(r, ['OPEX']), f.ano);
  const slFluxo = monthlySeries(allRecords, (r) => {
    const rec = sumByTipo(r, ['RECEITA']);
    const desp = sumAbsByTipo(r, ['OPEX', 'DESPESA']);
    const cx = sumAbsByTipo(r, ['CAPEX']);
    return rec - desp - cx;
  }, f.ano);
  const slBudget = monthlySeries(allRecords, (r) => r.reduce((a, x) => a + (x.budget ?? 0), 0), f.ano);
  const slReal = monthlySeries(allRecords, (r) => r.reduce((a, x) => a + Math.abs(x.realizado ?? 0), 0), f.ano);
  const slFc = monthlySeries(allRecords, (r) => r.reduce((a, x) => a + (x.forecast ?? 0), 0), f.ano);

  const buildKpi = (
    value: number,
    prev: number,
    sparkline: { label: string; value: number }[],
    higherIsBetter = true,
    incomplete = false,
  ): KpiResult => {
    const delta = deltaPct(value, prev);
    return {
      value,
      previous: prev,
      deltaPct: delta,
      sparkline,
      status: incomplete ? 'info' : statusFromDelta(higherIsBetter ? delta : -delta, th),
      incomplete,
    };
  };

  return {
    receita: buildKpi(receita, receitaPrev, slReceita),
    ebitda: buildKpi(ebitda, ebitdaPrev.previous, slEbitda, true, false),
    lucroLiquido: buildKpi(lucroLiquido, ebitdaPrev.previous * 0.7, slLucro, true, lucroIncomplete),
    margemEbitda: {
      value: margemEbitda,
      previous: (ebitdaPrev.current - sumAbsByTipo(filtered, ['OPEX', 'DESPESA'])) / (receitaPrev || 1) * 100,
      deltaPct: deltaPct(margemEbitda, 0),
      sparkline: slEbitda.map((p) => ({ ...p, value: p.value })),
      status: margemEbitda >= th.margemEbitda.good ? 'success' : margemEbitda >= th.margemEbitda.warn ? 'warning' : 'danger',
    },
    fluxoCaixa: buildKpi(fluxoCaixa, fluxoCaixa * 0.9, slFluxo),
    capitalGiro: buildKpi(capitalGiro, capitalGiro * 0.88, slFluxo),
    budget: buildKpi(budgetTotal, budgetTotal * 0.9, slBudget, true, budgetTotal === 0),
    realizado: buildKpi(realizadoTotal, realizadoTotal * 0.9, slReal, true, realizadoTotal === 0),
    forecast: buildKpi(forecastTotal, forecastTotal * 0.9, slFc, true, forecastTotal === 0),
    capex: buildKpi(capexCur, capexPrev, slCapex, false),
    opex: buildKpi(opexCur, opexPrev, slOpex, false),
    roi: buildKpi(roi, roi * 0.85, slCapex, true, investimentoTotal === 0),
    roic: buildKpi(roic, roic * 0.85, slCapex, true, investimentoTotal === 0),
  };
}

export function buildAlertas(records: FactRecord[], thresholds: Thresholds): import('../types').Alerta[] {
  const alertas: import('../types').Alerta[] = [];
  const hoje = new Date().toISOString().slice(0, 10);

  // Budget estourado por centro de custo
  const porCentro = new Map<string, { budget: number; realizado: number }>();
  records.forEach((r) => {
    if (!r.centroCusto) return;
    const cur = porCentro.get(r.centroCusto) ?? { budget: 0, realizado: 0 };
    cur.budget += r.budget ?? 0;
    cur.realizado += Math.abs(r.realizado ?? 0);
    porCentro.set(r.centroCusto, cur);
  });
  porCentro.forEach((v, centro) => {
    if (v.budget > 0 && v.realizado / v.budget > 1.0) {
      alertas.push({
        id: `al-budget-${centro}`,
        tipo: 'budget_estourado',
        titulo: `Budget estourado — ${centro}`,
        descricao: `Realizado de R$ ${v.realizado.toLocaleString('pt-BR')} ultrapassa orçamento de R$ ${v.budget.toLocaleString('pt-BR')} (${((v.realizado / v.budget) * 100).toFixed(0)}%).`,
        severidade: 'critico',
        modulo: 'budget',
        entidadeId: centro,
        link: '/budget',
        criadoEm: hoje,
        lido: false,
      });
    } else if (v.budget > 0 && v.realizado / v.budget > 0.9) {
      alertas.push({
        id: `al-budget-warn-${centro}`,
        tipo: 'budget_proximo',
        titulo: `Budget próximo do limite — ${centro}`,
        descricao: `Realizado em ${(v.realizado / v.budget * 100).toFixed(0)}% do orçamento.`,
        severidade: 'atencao',
        modulo: 'budget',
        entidadeId: centro,
        link: '/budget',
        criadoEm: hoje,
        lido: false,
      });
    }
  });

  // Fornecedor bloqueado
  const fornecedores = new Set(records.map((r) => r.fornecedor).filter(Boolean) as string[]);
  const bloqueados = ['EnergiaMais', 'HardwarePro', 'InsumosBR'];
  fornecedores.forEach((f) => {
    if (bloqueados.includes(f)) {
      alertas.push({
        id: `al-forn-${f}`,
        tipo: 'fornecedor_bloqueado',
        titulo: `Fornecedor bloqueado — ${f}`,
        descricao: 'Fornecedor com status bloqueado ou suspenso. Novas compras devem ser restringidas.',
        severidade: 'critico',
        modulo: 'compras',
        entidadeId: f,
        link: '/compras',
        criadoEm: hoje,
        lido: false,
      });
    }
  });

  // Fluxo de caixa negativo (mês atual)
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  const mesRecs = records.filter((r) => r.ano === anoAtual && r.mes === mesAtual);
  const receitaMes = sumByTipo(mesRecs, ['RECEITA']);
  const despMes = sumAbsByTipo(mesRecs, ['OPEX', 'DESPESA']);
  const capexMes = sumAbsByTipo(mesRecs, ['CAPEX']);
  const fcMes = receitaMes - despMes - capexMes;
  if (fcMes < 0) {
    alertas.push({
      id: 'al-fcx-neg',
      tipo: 'fluxo_caixa_negativo',
      titulo: 'Fluxo de caixa negativo no mês',
      descricao: `O fluxo de caixa do mês corrente está em R$ ${fcMes.toLocaleString('pt-BR')}. Ação recomendada: revisar desembolsos.`,
      severidade: 'critico',
      modulo: 'fluxo-caixa',
      link: '/fluxo-caixa',
      criadoEm: hoje,
      lido: false,
    });
  }

  // Nota fiscal pendente
  const pendentes = records.filter((r) => r.status === 'Pendente').slice(0, 5);
  pendentes.forEach((r) => {
    alertas.push({
      id: `al-nf-${r.id}`,
      tipo: 'nota_fiscal_pendente',
      titulo: 'Nota fiscal pendente de aprovação',
      descricao: `NF ${r.notaFiscal ?? r.documento} — ${r.fornecedor ?? r.cliente} — R$ ${Math.abs(r.valor).toLocaleString('pt-BR')}.`,
      severidade: 'atencao',
      modulo: 'compras',
      entidadeId: r.id,
      link: '/compras',
      criadoEm: hoje,
      lido: false,
    });
  });

  // CAPEX parado (sem movimentação CAPEX no mês)
  if (capexMes === 0) {
    alertas.push({
      id: 'al-capex-parado',
      tipo: 'capex_parado',
      titulo: 'CAPEX sem movimentação no mês',
      descricao: 'Nenhum lançamento de CAPEX registrado no mês corrente. Verificar projetos parados.',
      severidade: 'atencao',
      modulo: 'capex',
      link: '/capex',
      criadoEm: hoje,
      lido: false,
    });
  }

  return alertas;
}
