import type { FactRecord, Alerta } from '../types';
import type { KpiSet, FilterState } from './kpi';
import { formatCurrency, formatSignedPercent, formatPercent, monthFullLabel } from './format';

const STATUS_LABEL: Record<string, string> = {
  success: 'bom',
  warning: 'atenção',
  danger: 'crítico',
  info: 'informativo',
  neutral: 'neutro',
};

export function buildAiContext(
  kpis: KpiSet | null,
  filtered: FactRecord[],
  filters: FilterState,
  alertas: Alerta[],
): string {
  const lines: string[] = [];

  const ano = filters.ano ?? new Date().getFullYear();
  lines.push('## PERÍODO E FILTROS');
  lines.push(`- Ano de referência: ${ano}`);
  if (filters.mes) lines.push(`- Mês: ${monthFullLabel(filters.mes)}`);
  if (filters.empresa) lines.push(`- Empresa: ${filters.empresa}`);
  if (filters.loja) lines.push(`- Loja: ${filters.loja}`);
  if (filters.centroCusto) lines.push(`- Centro de custo: ${filters.centroCusto}`);
  if (filters.categoria) lines.push(`- Categoria: ${filters.categoria}`);
  if (filters.fornecedor) lines.push(`- Fornecedor: ${filters.fornecedor}`);
  if (filters.projeto) lines.push(`- Projeto: ${filters.projeto}`);

  if (!kpis) {
    lines.push('\n[Dados ainda carregando — KPIs indisponíveis]');
    return lines.join('\n');
  }

  const kpiList: Array<[string, typeof kpis.receita, 'currency' | 'percent']> = [
    ['Receita', kpis.receita, 'currency'],
    ['EBITDA', kpis.ebitda, 'currency'],
    ['Lucro Líquido', kpis.lucroLiquido, 'currency'],
    ['Margem EBITDA', kpis.margemEbitda, 'percent'],
    ['Fluxo de Caixa', kpis.fluxoCaixa, 'currency'],
    ['Capital de Giro', kpis.capitalGiro, 'currency'],
    ['Budget', kpis.budget, 'currency'],
    ['Realizado', kpis.realizado, 'currency'],
    ['Forecast', kpis.forecast, 'currency'],
    ['CAPEX', kpis.capex, 'currency'],
    ['OPEX', kpis.opex, 'currency'],
    ['ROI', kpis.roi, 'percent'],
    ['ROIC', kpis.roic, 'percent'],
  ];

  lines.push('\n## INDICADORES PRINCIPAIS (KPIs)');
  for (const [label, kpi, fmt] of kpiList) {
    const val = fmt === 'percent' ? formatPercent(kpi.value) : formatCurrency(kpi.value);
    const delta = formatSignedPercent(kpi.deltaPct);
    const status = STATUS_LABEL[kpi.status] ?? kpi.status;
    const incomplete = kpi.incomplete ? ' [DADO INCOMPLETO]' : '';
    lines.push(`- ${label}: ${val} | variação vs período anterior: ${delta} | status: ${status}${incomplete}`);
  }

  const receitaPorEmpresa = new Map<string, number>();
  filtered.filter((r) => r.tipoMovimento === 'RECEITA').forEach((r) => {
    receitaPorEmpresa.set(r.empresa, (receitaPorEmpresa.get(r.empresa) ?? 0) + r.valor);
  });
  const topEmpresas = Array.from(receitaPorEmpresa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topEmpresas.length) {
    lines.push('\n## RECEITA POR EMPRESA');
    topEmpresas.forEach(([emp, val], i) => lines.push(`${i + 1}. ${emp}: ${formatCurrency(val)}`));
  }

  const despPorCat = new Map<string, number>();
  filtered.filter((r) => ['OPEX', 'DESPESA'].includes(r.tipoMovimento ?? '')).forEach((r) => {
    const cat = r.categoria ?? 'Outros';
    despPorCat.set(cat, (despPorCat.get(cat) ?? 0) + Math.abs(r.valor));
  });
  const topDesp = Array.from(despPorCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topDesp.length) {
    lines.push('\n## DESPESAS POR CATEGORIA (Top 5)');
    topDesp.forEach(([cat, val], i) => lines.push(`${i + 1}. ${cat}: ${formatCurrency(val)}`));
  }

  const budgetPorCC = new Map<string, { budget: number; realizado: number }>();
  filtered.forEach((r) => {
    if (!r.centroCusto) return;
    const cur = budgetPorCC.get(r.centroCusto) ?? { budget: 0, realizado: 0 };
    cur.budget += r.budget ?? 0;
    cur.realizado += Math.abs(r.realizado ?? 0);
    budgetPorCC.set(r.centroCusto, cur);
  });
  const topBudget = Array.from(budgetPorCC.entries()).sort((a, b) => b[1].realizado - a[1].realizado).slice(0, 5);
  if (topBudget.length) {
    lines.push('\n## BUDGET VS REALIZADO POR CENTRO DE CUSTO (Top 5)');
    topBudget.forEach(([cc, v]) => {
      const aderencia = v.budget > 0 ? ((v.realizado / v.budget) * 100).toFixed(0) : '—';
      lines.push(`- ${cc}: Budget ${formatCurrency(v.budget)} | Realizado ${formatCurrency(v.realizado)} | Aderência ${aderencia}%`);
    });
  }

  const capexPorCat = new Map<string, number>();
  filtered.filter((r) => r.tipoMovimento === 'CAPEX').forEach((r) => {
    const cat = r.categoria ?? 'Outros';
    capexPorCat.set(cat, (capexPorCat.get(cat) ?? 0) + Math.abs(r.valor));
  });
  const topCapex = Array.from(capexPorCat.entries()).sort((a, b) => b[1] - a[1]);
  if (topCapex.length) {
    lines.push('\n## CAPEX POR CATEGORIA');
    topCapex.forEach(([cat, val]) => lines.push(`- ${cat}: ${formatCurrency(val)}`));
  }

  const topForn = new Map<string, number>();
  filtered.filter((r) => r.fornecedor).forEach((r) => {
    topForn.set(r.fornecedor!, (topForn.get(r.fornecedor!) ?? 0) + Math.abs(r.valor));
  });
  const fornecedores = Array.from(topForn.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (fornecedores.length) {
    lines.push('\n## TOP FORNECEDORES (Top 5)');
    fornecedores.forEach(([f, val], i) => lines.push(`${i + 1}. ${f}: ${formatCurrency(val)}`));
  }

  if (alertas.length) {
    lines.push('\n## ALERTAS ATIVOS');
    alertas.forEach((a) => {
      lines.push(`- [${a.severidade.toUpperCase()}] ${a.titulo}: ${a.descricao}`);
    });
  } else {
    lines.push('\n## ALERTAS ATIVOS');
    lines.push('- Nenhum alerta ativo no momento.');
  }

  const totalRegistros = filtered.length;
  lines.push(`\n## OBSERVAÇÕES`);
  lines.push(`- Total de registros no período filtrado: ${totalRegistros}`);
  if (totalRegistros === 0) lines.push('- ATENÇÃO: Não há dados para o período/filtros selecionados.');

  return lines.join('\n');
}
