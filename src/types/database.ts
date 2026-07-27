export type Papel = 'admin' | 'advogado' | 'cliente';

export type StatusProcesso =
  | 'em_andamento'
  | 'aguardando_documentacao'
  | 'concluido'
  | 'arquivado';

export type TipoCompromisso = 'audiencia' | 'reuniao' | 'prazo' | 'outro';

export type TipoDocumento =
  | 'procuracao'
  | 'peticao'
  | 'comprovante'
  | 'decisao'
  | 'outro';

export type CanalMensagem = 'portal' | 'whatsapp';

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  cliente_id: string | null;
  telefone: string | null;
  cpf: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Cliente {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  endereco: string | null;
  observacoes: string | null;
  foto_url: string | null;
  criado_em: string;
}

export interface Processo {
  id: string;
  numero: string;
  titulo: string;
  area_direito: string;
  status: StatusProcesso;
  cliente_id: string;
  advogado_id: string | null;
  descricao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Movimentacao {
  id: string;
  processo_id: string;
  status: string;
  descricao: string;
  criado_em: string;
}

export interface Documento {
  id: string;
  processo_id: string;
  nome_arquivo: string;
  url: string;
  tipo: TipoDocumento;
  enviado_por_id: string | null;
  criado_em: string;
}

export interface Mensagem {
  id: string;
  processo_id: string;
  remetente_id: string | null;
  conteudo: string;
  canal: CanalMensagem;
  lida: boolean;
  criado_em: string;
}

export interface Compromisso {
  id: string;
  processo_id: string | null;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  tipo: TipoCompromisso;
  lembrete_enviado: boolean;
  criado_em: string;
}

export interface AreaAtuacao {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
}

export interface Depoimento {
  id: string;
  nome: string;
  texto: string;
  cargo: string | null;
  ordem: number;
  ativo: boolean;
  criado_em: string;
}

export interface ConteudoSite {
  chave: string;
  valor: string;
  atualizado_em: string;
}

export interface LogAcesso {
  id: string;
  user_id: string | null;
  email: string | null;
  papel: string | null;
  ip: string | null;
  acao: string;
  criado_em: string;
}

export const STATUS_PROCESSO_LABEL: Record<StatusProcesso, string> = {
  em_andamento: 'Em andamento',
  aguardando_documentacao: 'Aguardando documentação',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

export const STATUS_PROCESSO_COR: Record<StatusProcesso, string> = {
  em_andamento: 'bg-blue-100 text-blue-700 border-blue-200',
  aguardando_documentacao: 'bg-amber-100 text-amber-700 border-amber-200',
  concluido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  arquivado: 'bg-slate-200 text-slate-700 border-slate-300',
};

export const TIPO_COMPROMISSO_LABEL: Record<TipoCompromisso, string> = {
  audiencia: 'Audiência',
  reuniao: 'Reunião',
  prazo: 'Prazo',
  outro: 'Outro',
};

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  procuracao: 'Procuração',
  peticao: 'Petição',
  comprovante: 'Comprovante',
  decisao: 'Decisão',
  outro: 'Outro',
};
