export type TipoMovimento = 'CAPEX' | 'OPEX' | 'RECEITA' | 'DESPESA' | 'OUTRO';

export interface FactRecord {
  id: string;
  empresa: string;
  loja?: string;
  centroCusto?: string;
  contaContabil?: string;
  projeto?: string;
  fornecedor?: string;
  documento?: string;
  notaFiscal?: string;
  data: string;
  ano: number;
  mes: number;
  categoria?: string;
  grupo?: string;
  subgrupo?: string;
  valor: number;
  quantidade?: number;
  status?: string;
  responsavel?: string;
  cliente?: string;
  tipoMovimento?: TipoMovimento;
  budget?: number;
  realizado?: number;
  forecast?: number;
  imobilizado?: boolean;
  depreciacao?: number;
  sourceFile?: string;
  importedAt?: string;
}

export interface Empresa {
  id: string;
  nome: string;
  regiao: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  status: 'ativo' | 'bloqueado' | 'suspenso';
}

export interface Projeto {
  id: string;
  nome: string;
  empresa: string;
  responsavel: string;
  inicio: string;
  fim: string;
  status: 'em_andamento' | 'concluido' | 'atrasado' | 'parado';
  orcamento: number;
}

export interface Alerta {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  severidade: 'ok' | 'atencao' | 'critico';
  modulo: string;
  entidadeId?: string;
  link?: string;
  criadoEm: string;
  lido: boolean;
}

export type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
