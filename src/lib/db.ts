/**
 * ATENÇÃO:
 * 1. Funções administrativas: acesso amplo, usadas pelo painel.
 * 2. Funções do portal do cliente: acesso restrito ao usuário autenticado.
 */
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp, Timestamp,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import { formatarDataHora } from './utils';
import type {
  Perfil, Cliente, Processo, Movimentacao, Documento, Mensagem,
  Compromisso, AreaAtuacao, Depoimento, ConteudoSite, LogAcesso,
  Notificacao, TipoNotificacao, Testemunha, Papel, StatusProcesso,
  TipoCompromisso, TipoDocumento, CanalMensagem,
} from '../types/database';
import { TIPO_COMPROMISSO_LABEL } from '../types/database';

type WithId<T> = T & { id: string };

type NovoDocumento = Omit<Documento, 'id' | 'criado_em' | 'visivel'> & {
  visivel?: boolean;
};

function toTimestamp(value: string | Date | Timestamp | undefined | null): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalize<T extends DocumentData>(id: string, d: DocumentData): T & { id: string } {
  const out: Record<string, unknown> = { id };

  for (const [k, v] of Object.entries(d)) {
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v === 'object' && '_seconds' in v && '_nanoseconds' in v) {
      out[k] = new Date((v as { _seconds: number })._seconds * 1000).toISOString();
    } else {
      out[k] = v;
    }
  }

  return out as T & { id: string };
}

/* ============================================================
 * FUNÇÕES ADMINISTRATIVAS
 * ============================================================ */

async function list<T extends DocumentData>(
  colecao: string,
  constraints: QueryConstraint[] = [],
): Promise<WithId<T>[]> {
  const q = query(collection(db, colecao), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => normalize<T>(d.id, d.data()) as WithId<T>);
}

async function one<T extends DocumentData>(
  colecao: string,
  id: string,
): Promise<WithId<T> | null> {
  const snap = await getDoc(doc(db, colecao, id));

  if (!snap.exists()) return null;

  return normalize<T>(snap.id, snap.data() as DocumentData) as WithId<T>;
}

export async function getPerfil(uid: string): Promise<Perfil | null> {
  return one<Perfil>('perfis', uid);
}

export async function createPerfil(
  uid: string,
  p: Omit<Perfil, 'id' | 'criado_em' | 'atualizado_em'>,
): Promise<void> {
  await setDoc(doc(db, 'perfis', uid), {
    ...p,
    cliente_id: p.cliente_id || null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });
}

export async function updatePerfil(
  uid: string,
  dados: Partial<Pick<Perfil, 'nome' | 'telefone' | 'cpf' | 'foto_url' | 'cliente_id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'perfis', uid), {
    ...dados,
    atualizado_em: serverTimestamp(),
  });
}

export async function listPerfis(): Promise<Perfil[]> {
  const snap = await getDocs(collection(db, 'perfis'));
  return snap.docs.map((d) => normalize<Perfil>(d.id, d.data()));
}

export async function updatePapelPerfil(uid: string, papel: Papel): Promise<void> {
  await updateDoc(doc(db, 'perfis', uid), {
    papel,
    atualizado_em: serverTimestamp(),
  });
}

export async function deletePerfil(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'perfis', uid));
}

/* CONVITES DE ADVOGADO */

export interface ConviteAdvogado {
  id: string;
  email: string;
  criado_por: string | null;
  criado_em: string;
  expira_em: string;
  usado: boolean;
  usado_por: string | null;
}

function gerarToken(tamanho = 32): string {
  const arr = new Uint8Array(tamanho);
  crypto.getRandomValues(arr);

  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

const CONVITE_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

export async function criarConviteAdvogado(
  email: string,
  criadoPor: string | null,
): Promise<string> {
  const token = gerarToken();

  await setDoc(doc(db, 'convites_advogado', token), {
    email: email.trim().toLowerCase(),
    criado_por: criadoPor,
    criado_em: serverTimestamp(),
    expira_em: new Date(Date.now() + CONVITE_VALIDADE_MS).toISOString(),
    usado: false,
    usado_por: null,
  });

  return token;
}

export async function getConviteAdvogado(token: string): Promise<ConviteAdvogado | null> {
  return one<ConviteAdvogado>('convites_advogado', token);
}

export async function consumirConviteAdvogado(token: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'convites_advogado', token), {
    usado: true,
    usado_por: uid,
  });
}

export async function listClientes(): Promise<Cliente[]> {
  return list<Cliente>('clientes', [orderBy('criado_em', 'desc')]);
}

export async function findClienteByEmail(email: string): Promise<Cliente | null> {
  const arr = await list<Cliente>('clientes', [
    where('email', '==', email),
    limit(1),
  ]);

  return arr[0] ?? null;
}

export async function getCliente(id: string): Promise<Cliente | null> {
  return one<Cliente>('clientes', id);
}

export async function createCliente(
  c: Omit<Cliente, 'id' | 'criado_em' | 'advogado_id' | 'foto_url' | 'user_id'> & {
    user_id?: string | null;
    advogado_id?: string | null;
    foto_url?: string | null;
  },
): Promise<string> {
  const ref = await addDoc(collection(db, 'clientes'), {
    ...c,
    foto_url: null,
    criado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function updateCliente(id: string, dados: Partial<Cliente>): Promise<void> {
  await updateDoc(doc(db, 'clientes', id), dados);
}

export async function deleteCliente(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clientes', id));
}

export async function listProcessos(): Promise<Processo[]> {
  return list<Processo>('processos', [orderBy('atualizado_em', 'desc')]);
}

export async function listProcessosByCliente(clienteId: string): Promise<Processo[]> {
  const arr = await list<Processo>('processos', [
    where('cliente_id', '==', clienteId),
  ]);

  return arr.sort(
    (a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime(),
  );
}

export async function listProcessosByAdvogado(advogadoId: string): Promise<Processo[]> {
  const arr = await list<Processo>('processos', [
    where('advogado_id', '==', advogadoId),
  ]);

  return arr.sort(
    (a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime(),
  );
}

export async function getProcesso(id: string): Promise<Processo | null> {
  return one<Processo>('processos', id);
}

export async function createProcesso(
  p: Omit<Processo, 'id' | 'criado_em' | 'atualizado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'processos'), {
    ...p,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function updateProcesso(id: string, dados: Partial<Processo>): Promise<void> {
  await updateDoc(doc(db, 'processos', id), {
    ...dados,
    atualizado_em: serverTimestamp(),
  });
}

export async function updateStatusProcesso(
  id: string,
  status: StatusProcesso,
): Promise<void> {
  await updateProcesso(id, { status });
}

export async function listMovimentacoes(processoId: string): Promise<Movimentacao[]> {
  const arr = await list<Movimentacao>('movimentacoes', [
    where('processo_id', '==', processoId),
  ]);

  return arr.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );
}

export async function createMovimentacao(
  m: Omit<Movimentacao, 'id' | 'criado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'movimentacoes'), {
    ...m,
    criado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function deleteMovimentacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'movimentacoes', id));
}

/* DOCUMENTOS */

export async function listDocumentos(processoId: string): Promise<Documento[]> {
  const arr = await list<Documento>('documentos', [
    where('processo_id', '==', processoId),
  ]);

  return arr.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );
}

/** Cria documento. Por padrão, documentos criados sem indicação ficam visíveis. */
export async function createDocumento(d: NovoDocumento): Promise<string> {
  const ref = await addDoc(collection(db, 'documentos'), {
    ...d,
    visivel: d.visivel ?? true,
    criado_em: serverTimestamp(),
  });

  return ref.id;
}

/** Libera ou oculta um documento para o cliente. */
export async function updateDocumentoVisibilidade(
  id: string,
  visivel: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'documentos', id), { visivel });
}

export async function deleteDocumento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'documentos', id));
}

export async function updateDocumentoVisivel(id: string, visivel: boolean): Promise<void> {
  const docRef = doc(db, 'documentos', id);
  await updateDoc(docRef, { visivel });
}

export async function createMensagem(
  m: Omit<Mensagem, 'id' | 'criado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'mensagens'), {
    ...m,
    criado_em: serverTimestamp(),
  });

  void agendarNotificacaoMensagem({ ...m, id: ref.id }).catch((e) =>
    console.error('Falha ao criar notificação de mensagem:', e),
  );

  return ref.id;
}

export async function marcarMensagemLida(id: string): Promise<void> {
  await updateDoc(doc(db, 'mensagens', id), { lida: true });
}

export async function listMensagensNaoLidas(maxCount = 5): Promise<Mensagem[]> {
  const arr = await list<Mensagem>('mensagens', [
    where('lida', '==', false),
  ]);

  return arr
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, maxCount);
}

export async function listCompromissos(): Promise<Compromisso[]> {
  return list<Compromisso>('compromissos', [
    orderBy('data_hora', 'asc'),
  ]);
}

export async function listCompromissosByProcesso(
  processoId: string,
): Promise<Compromisso[]> {
  const arr = await list<Compromisso>('compromissos', [
    where('processo_id', '==', processoId),
  ]);

  return arr.sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
  );
}

export async function listProximosCompromissos(maxCount = 5): Promise<Compromisso[]> {
  const agoraMs = Date.now();
  const arr = await list<Compromisso>('compromissos', [limit(200)]);

  return arr
    .filter((c) => {
      try {
        return new Date(c.data_hora).getTime() >= agoraMs;
      } catch {
        return false;
      }
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .slice(0, maxCount);
}

export async function listProximosCompromissosPorProcessos(
  processoIds: string[],
): Promise<Map<string, Compromisso[]>> {
  const porProcesso = new Map<string, Compromisso[]>();

  if (processoIds.length === 0) return porProcesso;

  const alvo = new Set(processoIds);
  const agoraMs = Date.now();
  const todos = await list<Compromisso>('compromissos', [limit(500)]);

  for (const c of todos) {
    if (!c.processo_id || !alvo.has(c.processo_id)) continue;

    const ts = new Date(c.data_hora).getTime();

    if (!Number.isFinite(ts) || ts < agoraMs) continue;

    const arr = porProcesso.get(c.processo_id) ?? [];
    arr.push(c);
    porProcesso.set(c.processo_id, arr);
  }

  for (const arr of porProcesso.values()) {
    arr.sort(
      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
    );
  }

  return porProcesso;
}

export async function createCompromisso(
  c: Omit<Compromisso, 'id' | 'criado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'compromissos'), {
    ...c,
    data_hora: Timestamp.fromDate(new Date(c.data_hora)),
    criado_em: serverTimestamp(),
  });

  void agendarNotificacaoCompromisso({ ...c, id: ref.id }).catch((e) =>
    console.error('Falha ao criar notificação de compromisso:', e),
  );

  return ref.id;
}

export async function deleteCompromisso(id: string): Promise<void> {
  await deleteDoc(doc(db, 'compromissos', id));
}

export async function updateCompromisso(
  id: string,
  dados: Partial<Compromisso>,
): Promise<void> {
  const payload: Record<string, unknown> = { ...dados };

  if (typeof payload.data_hora === 'string') {
    const d = new Date(payload.data_hora as string);

    if (isNaN(d.getTime())) throw new Error('Data inválida');

    payload.data_hora = Timestamp.fromDate(d);
  }

  await updateDoc(doc(db, 'compromissos', id), payload);
}

/* ÁREAS DE ATUAÇÃO */

export async function listAreasAtuacao(apenasAtivas = false): Promise<AreaAtuacao[]> {
  const todos = await list<AreaAtuacao>('areas_atuacao', [
    orderBy('ordem', 'asc'),
  ]);

  return apenasAtivas ? todos.filter((a) => a.ativo) : todos;
}

export async function createAreaAtuacao(
  a: Omit<AreaAtuacao, 'id' | 'criado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'areas_atuacao'), {
    ...a,
    criado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function updateAreaAtuacao(
  id: string,
  dados: Partial<AreaAtuacao>,
): Promise<void> {
  await updateDoc(doc(db, 'areas_atuacao', id), dados);
}

export async function deleteAreaAtuacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'areas_atuacao', id));
}

/* DEPOIMENTOS */

export async function listDepoimentos(apenasAtivos = false): Promise<Depoimento[]> {
  const todos = await list<Depoimento>('depoimentos', [
    orderBy('ordem', 'asc'),
  ]);

  return apenasAtivos ? todos.filter((d) => d.ativo) : todos;
}

export async function createDepoimento(
  d: Omit<Depoimento, 'id' | 'criado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'depoimentos'), {
    ...d,
    criado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function updateDepoimento(
  id: string,
  dados: Partial<Depoimento>,
): Promise<void> {
  await updateDoc(doc(db, 'depoimentos', id), dados);
}

export async function deleteDepoimento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'depoimentos', id));
}

/* CONTEÚDO DO SITE */

export async function getConteudoSite(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'conteudo_site'));
  const map: Record<string, string> = {};

  snap.docs.forEach((d) => {
    const data = d.data() as { chave: string; valor: string };
    map[data.chave] = data.valor;
  });

  return map;
}

export async function upsertConteudoSite(
  chave: string,
  valor: string,
): Promise<void> {
  await setDoc(doc(db, 'conteudo_site', chave), {
    chave,
    valor,
    atualizado_em: serverTimestamp(),
  });
}

export async function listLogsAcesso(maxCount = 200): Promise<LogAcesso[]> {
  return list<LogAcesso>('logs_acesso', [
    orderBy('criado_em', 'desc'),
    limit(maxCount),
  ]);
}

/* NOTIFICAÇÕES */

const LIMITE_LEMBRETE_HORAS = 24;

export async function createNotificacao(
  n: Omit<Notificacao, 'id' | 'criado_em' | 'atualizado_em' | 'lida' | 'push_enviado' | 'push_enviado_em'>,
  id?: string,
): Promise<string> {
  const payload = {
    ...n,
    lida: false,
    push_enviado: false,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  };

  if (id) {
    await setDoc(doc(collection(db, 'notificacoes'), id), payload, { merge: true });
    return id;
  }

  const ref = await addDoc(collection(db, 'notificacoes'), payload);
  return ref.id;
}

export async function listNotificoes(destinatarioId: string): Promise<Notificacao[]> {
  const arr = await list<Notificacao>('notificacoes', [
    where('destinatario_id', '==', destinatarioId),
    limit(200),
  ]);

  return arr
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 100);
}

export async function listNotificoesNaoLidas(
  destinatarioId: string,
  maxCount = 50,
): Promise<Notificacao[]> {
  const arr = await list<Notificacao>('notificacoes', [
    where('destinatario_id', '==', destinatarioId),
    limit(500),
  ]);

  return arr
    .filter((n) => !n.lida)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, maxCount);
}

export async function listNotificoesNaoLidasVisiveis(
  _papel: Papel | null | undefined,
  uid: string,
  maxCount = 50,
): Promise<Notificacao[]> {
  return listNotificoesNaoLidas(uid, maxCount);
}

export async function contarNotificoesNaoLidas(destinatarioId: string): Promise<number> {
  const arr = await listNotificoesNaoLidas(destinatarioId, 1000);
  return arr.length;
}

export async function marcarNotificaoLida(id: string): Promise<void> {
  await updateDoc(doc(db, 'notificacoes', id), {
    lida: true,
    atualizado_em: serverTimestamp(),
  });
}

export async function marcarNotificoesLidasTodas(destinatarioId: string): Promise<void> {
  const arr = await listNotificoesNaoLidas(destinatarioId, 1000);
  await Promise.all(arr.map((n) => marcarNotificaoLida(n.id)));
}

export async function deleteNotificacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notificacoes', id));
}

export async function limparNotificoesAntigas(
  dias = 30,
  destinatarioId?: string,
): Promise<number> {
  const corteMs = new Date();
  corteMs.setDate(corteMs.getDate() - dias);
  const corte = corteMs.getTime();

  const constraints = destinatarioId
    ? [where('destinatario_id', '==', destinatarioId), limit(500)]
    : [limit(200)];

  const snap = await getDocs(
    query(collection(db, 'notificacoes'), ...constraints),
  );

  const antigasLidas = snap.docs.filter((d) => {
    const data = d.data();

    if (data.lida !== true) return false;

    try {
      const criado = data.criado_em instanceof Timestamp
        ? data.criado_em.toDate().getTime()
        : new Date(data.criado_em).getTime();

      return criado <= corte;
    } catch {
      return false;
    }
  });

  await Promise.all(antigasLidas.map((d) => deleteDoc(d.ref)));

  return antigasLidas.length;
}

export async function limparNotificacoesLidas(destinatarioId: string): Promise<number> {
  const arr = await list<Notificacao>('notificacoes', [
    where('destinatario_id', '==', destinatarioId),
    limit(500),
  ]);

  const lidas = arr.filter((n) => n.lida);

  await Promise.all(
    lidas.map((n) => deleteDoc(doc(db, 'notificacoes', n.id))),
  );

  return lidas.length;
}

/* PUSH TOKENS */

export async function salvarPushToken(uid: string, token: string): Promise<void> {
  await setDoc(doc(db, 'push_tokens', token), {
    uid,
    dispositivo: typeof navigator !== 'undefined'
      ? navigator.userAgent.slice(0, 300)
      : null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  }, { merge: true });
}

export async function removerPushToken(token: string): Promise<void> {
  await deleteDoc(doc(db, 'push_tokens', token));
}

export async function removerPushTokensDoUsuario(uid: string): Promise<void> {
  const arr = await list<{ uid: string }>('push_tokens', [
    where('uid', '==', uid),
    limit(500),
  ]);

  await Promise.all(arr.map((t) => removerPushToken(t.id)));
}

async function destinatariosCompromisso(
  c: Omit<Compromisso, 'criado_em'> & {
    processo?: Processo | null;
    id?: string;
  },
): Promise<Set<string>> {
  const processo = c.processo ?? (
    c.processo_id ? await getProcesso(c.processo_id) : null
  );

  if (!processo) return new Set();

  const cliente = await getCliente(processo.cliente_id);
  const dest = new Set<string>();

  if (processo.advogado_id) dest.add(processo.advogado_id);
  if (cliente?.user_id) dest.add(cliente.user_id);

  return dest;
}

export async function agendarNotificacaoCompromisso(
  c: Omit<Compromisso, 'criado_em'> & {
    processo?: Processo | null;
    id?: string;
  },
): Promise<void> {
  const dest = await destinatariosCompromisso(c);

  if (dest.size === 0) return;

  const titulo = `Compromisso: ${c.titulo}`;
  const texto = `Você tem um(a) ${TIPO_COMPROMISSO_LABEL[c.tipo].toLowerCase()} agendado(a) para ${formatarDataHora(c.data_hora)}.`;

  await Promise.all([...dest].map((uid) => createNotificacao({
    destinatario_id: uid,
    titulo,
    mensagem: texto,
    tipo: 'compromisso',
    origem_id: c.id ?? null,
    origem_tipo: 'compromisso',
  })));
}

export async function agendarNotificacaoMensagem(
  m: Omit<Mensagem, 'criado_em'> & { id?: string },
): Promise<void> {
  const processo = await getProcesso(m.processo_id);

  if (!processo) return;

  const cliente = await getCliente(processo.cliente_id);
  let destinatarioId: string | null = null;

  if (cliente?.user_id === m.remetente_id) {
    destinatarioId = processo.advogado_id;
  } else {
    destinatarioId = cliente?.user_id ?? null;
  }

  if (!destinatarioId) return;

  const titulo = 'Nova mensagem';

  const texto = cliente?.user_id === m.remetente_id
    ? `Você recebeu uma nova mensagem de ${cliente?.nome ?? 'seu cliente'}.`
    : 'Você recebeu uma nova mensagem do seu escritório.';

  await createNotificacao({
    destinatario_id: destinatarioId,
    titulo,
    mensagem: texto,
    tipo: 'mensagem',
    origem_id: m.id ?? null,
    origem_tipo: 'mensagem',
  });
}

export async function verificarLembretesCompromissos(): Promise<number> {
  const agora = Date.now();
  const limite = new Date(agora + LIMITE_LEMBRETE_HORAS * 3600 * 1000);
  const arr = await list<Compromisso>('compromissos', [limit(200)]);

  const pendentes = arr
    .filter((c) => !c.lembrete_enviado)
    .filter((c) => {
      try {
        const t = new Date(c.data_hora).getTime();
        return t >= agora && t <= limite.getTime();
      } catch {
        return false;
      }
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .slice(0, 50);

  let count = 0;

  for (const c of pendentes) {
    try {
      await criarNotificacaoLembrete(c);
      await updateCompromisso(c.id, { lembrete_enviado: true });
      count++;
    } catch {
      // Ignora falhas individuais.
    }
  }

  return count;
}

async function criarNotificacaoLembrete(
  c: Compromisso & { processo?: Processo | null },
): Promise<void> {
  const dest = await destinatariosCompromisso(c);

  if (dest.size === 0) return;

  const titulo = `Lembrete: ${c.titulo}`;
  const texto = `Sua ${TIPO_COMPROMISSO_LABEL[c.tipo].toLowerCase()} está próxima. Data/hora: ${formatarDataHora(c.data_hora)}.`;

  await Promise.all([...dest].map((uid) => createNotificacao({
    destinatario_id: uid,
    titulo,
    mensagem: texto,
    tipo: 'lembrete',
    origem_id: c.id ?? null,
    origem_tipo: 'compromisso',
  }, `lembrete_${c.id ?? 'sem-id'}_${uid}`)));
}

/* HELPERS DE JOIN */

export async function getProcessoComCliente(
  id: string,
): Promise<(Processo & { cliente: Cliente | null }) | null> {
  const p = await getProcesso(id);

  if (!p) return null;

  const c = await getCliente(p.cliente_id);

  return { ...p, cliente: c };
}

export async function listProcessosComClientes(): Promise<
  (Processo & { cliente: Cliente | null })[]
> {
  const [procs, clients] = await Promise.all([
    listProcessos(),
    listClientes(),
  ]);

  const map = new Map(clients.map((c) => [c.id, c]));

  return procs.map((p) => ({
    ...p,
    cliente: map.get(p.cliente_id) ?? null,
  }));
}

export async function listClientesComProcessos(): Promise<
  (Cliente & { processos: Processo[] })[]
> {
  const [clients, procs] = await Promise.all([
    listClientes(),
    listProcessos(),
  ]);

  const byClient = new Map<string, Processo[]>();

  procs.forEach((p) => {
    const arr = byClient.get(p.cliente_id) ?? [];
    arr.push(p);
    byClient.set(p.cliente_id, arr);
  });

  return clients.map((c) => ({
    ...c,
    processos: byClient.get(c.id) ?? [],
  }));
}

export async function listCompromissosComProcessos(): Promise<
  (Compromisso & { processo: Processo | null })[]
> {
  const [comps, procs] = await Promise.all([
    listCompromissos(),
    listProcessos(),
  ]);

  const map = new Map(procs.map((p) => [p.id, p]));

  return comps.map((c) => ({
    ...c,
    processo: c.processo_id ? map.get(c.processo_id) ?? null : null,
  }));
}

/* VISÃO POR PAPEL */

export async function listProcessosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<Processo[]> {
  if (papel === 'advogado') {
    return listProcessosByAdvogado(uid);
  }

  return listProcessos();
}

export async function listClientesByAdvogado(uid: string): Promise<Cliente[]> {
  return list<Cliente>('clientes', [
    where('advogado_id', '==', uid),
  ]);
}

export async function listClientesVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<Cliente[]> {
  if (papel !== 'advogado') {
    return listClientes();
  }

  const procs = await listProcessosByAdvogado(uid);
  const ids = [...new Set(procs.map((p) => p.cliente_id).filter(Boolean))];
  const procClients = await Promise.all(ids.map((id) => getCliente(id)));
  const meus = await listClientesByAdvogado(uid);

  const mapa = new Map<string, Cliente>();

  for (const c of [...procClients, ...meus]) {
    if (c) mapa.set(c.id, c);
  }

  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listProcessosComClientesVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<(Processo & { cliente: Cliente | null })[]> {
  if (papel !== 'advogado') {
    return listProcessosComClientes();
  }

  const procs = await listProcessosByAdvogado(uid);
  const clientes = await listClientesVisiveis('advogado', uid);
  const map = new Map(clientes.map((c) => [c.id, c]));

  return procs.map((p) => ({
    ...p,
    cliente: map.get(p.cliente_id) ?? null,
  }));
}

export async function listClientesComProcessosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<(Cliente & { processos: Processo[] })[]> {
  if (papel !== 'advogado') {
    return listClientesComProcessos();
  }

  const [clients, procs] = await Promise.all([
    listClientesVisiveis(papel, uid),
    listProcessosVisiveis(papel, uid),
  ]);

  const byClient = new Map<string, Processo[]>();

  procs.forEach((p) => {
    const arr = byClient.get(p.cliente_id) ?? [];
    arr.push(p);
    byClient.set(p.cliente_id, arr);
  });

  return clients.map((c) => ({
    ...c,
    processos: byClient.get(c.id) ?? [],
  }));
}

export async function listCompromissosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<(Compromisso & { processo: Processo | null })[]> {
  const procs = await listProcessosVisiveis(papel, uid);
  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = new Set(procs.map((p) => p.id));
  const all = await listCompromissos();

  if (papel === 'advogado') {
    return all
      .filter((c) => !c.processo_id || procIds.has(c.processo_id))
      .map((c) => ({
        ...c,
        processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null,
      }));
  }

  return all.map((c) => ({
    ...c,
    processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null,
  }));
}

export async function listMensagensNaoLidasVisiveis(
  papel: Papel | null | undefined,
  uid: string,
  maxCount = 5,
): Promise<Mensagem[]> {
  if (papel !== 'advogado') {
    return listMensagensNaoLidas(maxCount);
  }

  const procs = await listProcessosByAdvogado(uid);
  const todas: Mensagem[] = [];

  for (const p of procs) {
    todas.push(...(await listMensagens(p.id)));
  }

  return todas
    .filter((m) => !m.lida)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, maxCount);
}

export async function listProximosCompromissosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
  maxCount = 5,
): Promise<Compromisso[]> {
  if (papel !== 'advogado') {
    return listProximosCompromissos(maxCount);
  }

  const procs = await listProcessosByAdvogado(uid);
  const procIds = new Set(procs.map((p) => p.id));
  const all = await listProximosCompromissos(500);

  return all
    .filter((c) => !c.processo_id || procIds.has(c.processo_id))
    .slice(0, maxCount);
}

export async function listProcessosByClienteVisivel(
  papel: Papel | null | undefined,
  uid: string,
  clienteId: string,
): Promise<Processo[]> {
  if (papel === 'advogado') {
    const procs = await listProcessosByAdvogado(uid);

    return procs
      .filter((p) => p.cliente_id === clienteId)
      .sort(
        (a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime(),
      );
  }

  return listProcessosByCliente(clienteId);
}

export async function listCompromissosByClienteVisivel(
  papel: Papel | null | undefined,
  uid: string,
  clienteId: string,
): Promise<(Compromisso & { processo: Processo | null })[]> {
  if (papel === 'advogado') {
    return listCompromissosByProcessos(
      await listProcessosByClienteVisivel(papel, uid, clienteId),
    );
  }

  return listCompromissosByCliente(clienteId);
}

export async function listMensagensByClienteVisivel(
  papel: Papel | null | undefined,
  uid: string,
  clienteId: string,
): Promise<(Mensagem & { processo: Processo | null })[]> {
  if (papel === 'advogado') {
    const procs = await listProcessosByClienteVisivel(papel, uid, clienteId);

    if (procs.length === 0) return [];

    const procMap = new Map(procs.map((p) => [p.id, p]));
    const all: Mensagem[] = [];

    for (const pid of procs.map((p) => p.id)) {
      all.push(...(await listMensagens(pid)));
    }

    all.sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    );

    return all.map((m) => ({
      ...m,
      processo: m.processo_id ? procMap.get(m.processo_id) ?? null : null,
    }));
  }

  return listMensagensByCliente(clienteId);
}

/* PORTAL DO CLIENTE */

async function findClienteByUserId(userId: string): Promise<Cliente | null> {
  const arr = await list<Cliente>('clientes', [
    where('user_id', '==', userId),
    limit(1),
  ]);

  return arr[0] ?? null;
}

export const cliente = {
  async getPerfil(uid: string): Promise<Perfil | null> {
    return one<Perfil>('perfis', uid);
  },

  async updatePerfil(
    uid: string,
    dados: Partial<Pick<Perfil, 'nome' | 'telefone'>> & {
      foto_url?: string | null;
    },
  ): Promise<void> {
    await updateDoc(doc(db, 'perfis', uid), {
      ...dados,
      atualizado_em: serverTimestamp(),
    });

    const p = await this.getPerfil(uid);

    if (p?.cliente_id) {
      const { foto_url, ...dadosCliente } = dados;

      await updateCliente(p.cliente_id, {
        ...dadosCliente,
        foto_url: foto_url || undefined,
      });
    }
  },

  async listProcessos(userId: string): Promise<Processo[]> {
    const c = await findClienteByUserId(userId);

    if (!c) return [];

    return listProcessosByCliente(c.id);
  },

  async getProcesso(userId: string, processoId: string): Promise<Processo | null> {
    const c = await findClienteByUserId(userId);

    if (!c) return null;

    const processo = await one<Processo>('processos', processoId);

    if (processo?.cliente_id !== c.id) return null;

    return processo;
  },

  async listMovimentacoes(
    userId: string,
    processoId: string,
  ): Promise<Movimentacao[]> {
    const processo = await this.getProcesso(userId, processoId);

    if (!processo) return [];

    return listMovimentacoes(processoId);
  },

  /** Cliente só recebe documentos com visivel == true. */
  async listDocumentos(
    userId: string,
    processoId: string,
  ): Promise<Documento[]> {
    const processo = await this.getProcesso(userId, processoId);

    if (!processo) return [];

    const docs = await list<Documento>('documentos', [
      where('processo_id', '==', processoId),
      where('visivel', '==', true),
    ]);

    return docs.sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    );
  },

  async createDocumento(userId: string, d: NovoDocumento): Promise<string> {
    const processo = await this.getProcesso(userId, d.processo_id);

    if (!processo) throw new Error('Permissão negada');

    return createDocumento({
      ...d,
      visivel: true,
      enviado_por_id: userId,
    });
  },

  async listMensagens(
    userId: string,
    processoId: string,
  ): Promise<Mensagem[]> {
    const processo = await this.getProcesso(userId, processoId);

    if (!processo) return [];

    return listMensagens(processoId);
  },

  async createMensagem(
    userId: string,
    m: Omit<Mensagem, 'id' | 'criado_em'>,
  ): Promise<string> {
    const processo = await this.getProcesso(userId, m.processo_id);

    if (!processo) throw new Error('Permissão negada');

    const ref = await addDoc(collection(db, 'mensagens'), {
      ...m,
      criado_em: serverTimestamp(),
    });

    void agendarNotificacaoMensagem({ ...m, id: ref.id }).catch((e) =>
      console.error('Falha ao criar notificação de mensagem:', e),
    );

    return ref.id;
  },

  async listCompromissos(
    userId: string,
  ): Promise<(Compromisso & { processo: Processo | null })[]> {
    const procs = await this.listProcessos(userId);

    if (procs.length === 0) return [];

    const procMap = new Map(procs.map((p) => [p.id, p]));
    const procIds = new Set(procs.map((p) => p.id));
    const all = await list<Compromisso>('compromissos', [limit(500)]);
    const agoraMs = Date.now();

    return all
      .filter((c) => c.processo_id && procIds.has(c.processo_id))
      .map((c) => ({
        ...c,
        processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null,
      }))
      .filter((c) => {
        try {
          return new Date(c.data_hora).getTime() >= agoraMs;
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
      );
  },

  async createLogAcesso(
    log: Omit<LogAcesso, 'id' | 'criado_em'>,
  ): Promise<void> {
    await addDoc(collection(db, 'logs_acesso'), {
      ...log,
      criado_em: serverTimestamp(),
    });
  },

  async createConsentimentoLgpd(user_id: string): Promise<void> {
    await addDoc(collection(db, 'consentimentos_lgpd'), {
      user_id,
      versao_termos: '1.0',
      consentiu: true,
      criado_em: serverTimestamp(),
    });
  },

  async listTestemunhas(
    userId: string,
    processoId: string,
  ): Promise<Testemunha[]> {
    const processo = await this.getProcesso(userId, processoId);

    if (!processo) return [];

    return listTestemunhasByProcesso(processoId);
  },

  async createTestemunha(
    userId: string,
    t: Omit<Testemunha, 'id' | 'criado_em' | 'ativo'> & {
      ativo?: boolean;
    },
  ): Promise<string> {
    const processo = await this.getProcesso(userId, t.processo_id);

    if (!processo) throw new Error('Permissão negada');

    return createTestemunha(t);
  },

  async updateTestemunha(
    userId: string,
    id: string,
    dados: Partial<Pick<Testemunha, 'nome' | 'email' | 'telefone' | 'cpf' | 'endereco' | 'cargo' | 'relacao'>>,
  ): Promise<void> {
    const atual = await getTestemunha(id);

    if (!atual) throw new Error('Testemunha não encontrada.');

    const processo = await this.getProcesso(userId, atual.processo_id);

    if (!processo) throw new Error('Permissão negada');

    await updateTestemunha(id, dados);
  },

  async deleteTestemunha(userId: string, id: string): Promise<void> {
    const atual = await getTestemunha(id);

    if (!atual) throw new Error('Testemunha não encontrada.');

    const processo = await this.getProcesso(userId, atual.processo_id);

    if (!processo) throw new Error('Permissão negada');

    await deleteTestemunha(id);
  },
};

/* TESTEMUNHAS */

export async function listTestemunhasByProcesso(
  processoId: string,
  apenasAtivas = true,
): Promise<Testemunha[]> {
  const arr = apenasAtivas
    ? await list<Testemunha>('testemunhas', [
        where('processo_id', '==', processoId),
        where('ativo', '==', true),
      ])
    : await list<Testemunha>('testemunhas', [
        where('processo_id', '==', processoId),
      ]);

  return arr.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );
}

/**
 * Admin pode consultar testemunhas de qualquer processo.
 * Advogado só pode consultar testemunhas de processo atribuído a ele.
 * Cliente só pode consultar testemunhas do próprio processo.
 */
export async function listTestemunhasVisivel(
  papel: Papel | null | undefined,
  uid: string,
  processoId: string,
): Promise<Testemunha[]> {
  if (papel === 'admin') {
    return listTestemunhasByProcesso(processoId, false);
  }

  if (papel === 'advogado') {
    const processo = await getProcesso(processoId);

    if (!processo || processo.advogado_id !== uid) {
      return [];
    }

    return listTestemunhasByProcesso(processoId, false);
  }

  return cliente.listTestemunhas(uid, processoId);
}

/**
 * Admin e advogado responsável veem todos os documentos do processo.
 * Cliente vê apenas os documentos liberados e pertencentes ao próprio processo.
 */
export async function listDocumentosVisivel(
  papel: Papel | null | undefined,
  uid: string,
  processoId: string,
): Promise<Documento[]> {
  if (papel === 'admin') {
    return listDocumentos(processoId);
  }

  if (papel === 'advogado') {
    const processo = await getProcesso(processoId);

    if (!processo || processo.advogado_id !== uid) {
      return [];
    }

    return listDocumentos(processoId);
  }

  return cliente.listDocumentos(uid, processoId);
}

export async function getTestemunha(id: string): Promise<Testemunha | null> {
  return one<Testemunha>('testemunhas', id);
}

export async function createTestemunha(
  t: Omit<Testemunha, 'id' | 'criado_em' | 'ativo'> & {
    ativo?: boolean;
  },
): Promise<string> {
  const ref = await addDoc(collection(db, 'testemunhas'), {
    ...t,
    ativo: t.ativo ?? true,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });

  return ref.id;
}

export async function updateTestemunha(
  id: string,
  dados: Partial<Pick<Testemunha, 'nome' | 'email' | 'telefone' | 'cpf' | 'endereco' | 'cargo' | 'relacao' | 'ativo'>>,
): Promise<void> {
  await updateDoc(doc(db, 'testemunhas', id), {
    ...dados,
    atualizado_em: serverTimestamp(),
  });
}

export async function deleteTestemunha(id: string): Promise<void> {
  await updateDoc(doc(db, 'testemunhas', id), {
    ativo: false,
    atualizado_em: serverTimestamp(),
  });
}

export { toTimestamp, serverTimestamp, Timestamp };

export type {
  Papel,
  StatusProcesso,
  TipoCompromisso,
  TipoDocumento,
  CanalMensagem,
  Notificacao,
  TipoNotificacao,
};

export async function listCompromissosByProcessos(
  procs: Processo[],
): Promise<(Compromisso & { processo: Processo | null })[]> {
  if (procs.length === 0) return [];

  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = procs.map((p) => p.id);
  const all = await list<Compromisso>('compromissos', [
    orderBy('data_hora', 'asc'),
  ]);

  return all
    .filter((c) => c.processo_id && procIds.includes(c.processo_id))
    .map((c) => ({
      ...c,
      processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null,
    }));
}

export async function listCompromissosByCliente(
  clienteId: string,
): Promise<(Compromisso & { processo: Processo | null })[]> {
  const procs = await listProcessosByCliente(clienteId);

  if (procs.length === 0) return [];

  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = procs.map((p) => p.id);
  const all = await list<Compromisso>('compromissos', [
    orderBy('data_hora', 'asc'),
  ]);

  return all
    .filter((c) => c.processo_id && procIds.includes(c.processo_id))
    .map((c) => ({
      ...c,
      processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null,
    }));
}

export async function listMensagens(processoId: string): Promise<Mensagem[]> {
  const arr = await list<Mensagem>('mensagens', [
    where('processo_id', '==', processoId),
  ]);

  return arr.sort(
    (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
  );
}

export async function listMensagensByCliente(
  clienteId: string,
): Promise<(Mensagem & { processo: Processo | null })[]> {
  const procs = await listProcessosByCliente(clienteId);

  if (procs.length === 0) return [];

  const procMap = new Map(procs.map((p) => [p.id, p]));
  const all: Mensagem[] = [];

  for (const p of procs) {
    all.push(...(await listMensagens(p.id)));
  }

  all.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );

  return all.map((m) => ({
    ...m,
    processo: m.processo_id ? procMap.get(m.processo_id) ?? null : null,
  }));
}