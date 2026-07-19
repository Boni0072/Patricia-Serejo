import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Wallet, ShieldCheck, Hammer, Boxes, Banknote,
  TrendingUp, Target, ShoppingCart, Package, FolderKanban, Building2,
  Gauge, FileSpreadsheet, Calculator,
} from 'lucide-react';

export interface ModuleDef {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  hint: string;
}

export const DATA_MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard, path: '/', hint: 'Visão geral consolidada' },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, path: '/financeiro', hint: 'Contas a pagar/receber, tesouraria' },
  { id: 'controladoria', label: 'Controladoria', icon: ShieldCheck, path: '/controladoria', hint: 'Conciliação, fechamento, auditoria' },
  { id: 'capex', label: 'CAPEX', icon: Hammer, path: '/capex', hint: 'Investimentos em capital' },
  { id: 'opex', label: 'OPEX', icon: Boxes, path: '/opex', hint: 'Despesas operacionais' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: Banknote, path: '/fluxo-caixa', hint: 'Projeções e realizado de caixa' },
  { id: 'resultado', label: 'Resultado', icon: TrendingUp, path: '/resultado', hint: 'DRE e margens' },
  { id: 'ebitda', label: 'EBITDA', icon: TrendingUp, path: '/ebitda', hint: 'Análise de EBITDA e EBIT' },
  { id: 'budget', label: 'Budget x Real', icon: Target, path: '/budget', hint: 'Orçado vs realizado' },
  { id: 'compras', label: 'Compras', icon: ShoppingCart, path: '/compras', hint: 'Pedidos, recebimentos, fornecedores' },
  { id: 'estoque', label: 'Estoque', icon: Package, path: '/estoque', hint: 'Saldo, giro e cobertura' },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban, path: '/projetos', hint: 'Portfólio de projetos' },
  { id: 'imobilizado', label: 'Imobilizado', icon: Building2, path: '/imobilizado', hint: 'Ativo imobilizado e depreciação' },
  { id: 'indicadores', label: 'Indicadores', icon: Gauge, path: '/indicadores', hint: 'KPIs e métricas' },
  { id: 'lancamentos', label: 'Lançamentos', icon: FileSpreadsheet, path: '/lancamentos', hint: 'Tabela fato universal' },
];
