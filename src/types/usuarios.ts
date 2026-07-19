export type Perfil = 'Administrador' | 'Diretoria' | 'Controladoria' | 'Contabilidade' | 'Financeiro' | 'Compras';

export type UsuarioStatus = 'ativo' | 'inativo' | 'suspenso';

export interface Usuario {
  id: string;
  firebase_uid?: string | null;
  nome: string;
  email: string;
  perfil: Perfil;
  cargo?: string | null;
  telefone?: string | null;
  foto_url?: string | null;
  status: UsuarioStatus;
  ultimo_acesso?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ModuloAcesso {
  id: string;
  usuario_id: string;
  modulo_id: string;
  pode_visualizar: boolean;
  pode_editar: boolean;
  pode_exportar: boolean;
  pode_administrar: boolean;
}

export type UsuarioInput = Omit<Usuario, 'id' | 'criado_em' | 'atualizado_em' | 'firebase_uid' | 'ultimo_acesso'>;

export interface ModuloDefAcesso {
  id: string;
  label: string;
  grupo: 'Executivo' | 'Financeiro' | 'Operacional' | 'Sistema';
}

export const MODULOS_ACESSO: ModuloDefAcesso[] = [
  { id: 'dashboard', label: 'Dashboard Executivo', grupo: 'Executivo' },
  { id: 'indicadores', label: 'Indicadores', grupo: 'Executivo' },
  { id: 'resultado', label: 'Resultado', grupo: 'Financeiro' },
  { id: 'ebitda', label: 'EBITDA', grupo: 'Financeiro' },
  { id: 'budget', label: 'Budget x Real', grupo: 'Financeiro' },
  { id: 'financeiro', label: 'Financeiro', grupo: 'Financeiro' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', grupo: 'Financeiro' },
  { id: 'controladoria', label: 'Controladoria', grupo: 'Financeiro' },
  { id: 'capex', label: 'CAPEX', grupo: 'Operacional' },
  { id: 'opex', label: 'OPEX', grupo: 'Operacional' },
  { id: 'compras', label: 'Compras', grupo: 'Operacional' },
  { id: 'estoque', label: 'Estoque', grupo: 'Operacional' },
  { id: 'projetos', label: 'Projetos', grupo: 'Operacional' },
  { id: 'imobilizado', label: 'Imobilizado', grupo: 'Operacional' },
  { id: 'lancamentos', label: 'Lançamentos', grupo: 'Sistema' },
  { id: 'alertas', label: 'Alertas', grupo: 'Sistema' },
  { id: 'fontes', label: 'Fontes de Dados', grupo: 'Sistema' },
  { id: 'configuracoes', label: 'Configurações', grupo: 'Sistema' },
  { id: 'usuarios', label: 'Usuários e Acessos', grupo: 'Sistema' },
];

export const PERFIL_DESCRICOES: Record<Perfil, string> = {
  Administrador: 'Acesso total a todos os módulos, dados e configurações.',
  Diretoria: 'Visão executiva consolidada; sem acesso a lançamentos detalhados.',
  Controladoria: 'Acesso a controladoria, budget, indicadores e fechamento.',
  Contabilidade: 'Lançamentos, notas fiscais e conciliação.',
  Financeiro: 'Fluxo de caixa, contas a pagar/receber e tesouraria.',
  Compras: 'Fornecedores, pedidos e contratos.',
};

export const PERFIS: Perfil[] = [
  'Administrador', 'Diretoria', 'Controladoria', 'Contabilidade', 'Financeiro', 'Compras',
];

export const STATUS_LABEL: Record<UsuarioStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  suspenso: 'Suspenso',
};
