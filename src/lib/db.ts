/**
 * ATENÇÃO: Este arquivo é dividido em duas seções principais:
 * 1. Funções para o PAINEL ADMINISTRATIVO: Funções que têm acesso amplo
 *    ao banco de dados. Elas NUNCA devem ser importadas ou usadas em
 *    componentes do portal do cliente.
 * 2. Funções para o PORTAL DO CLIENTE: Funções com acesso restrito,
 *    sempre filtrando os resultados pelo `userId` do usuário logado.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import { formatarDataHora } from './utils';
import type {
  Perfil, Cliente, Processo, Movimentacao, Documento, Mensagem,
  Compromisso, AreaAtuacao, Depoimento, ConteudoSite, LogAcesso,
  Notificacao, TipoNotificacao,
  Papel, StatusProcesso, TipoCompromisso, TipoDocumento, CanalMensagem,
} from '../types/database';
import { TIPO_COMPROMISSO_LABEL } from '../types/database';

type WithId<T> = T & { id: string };

function toTimestamp(value: string | Date | Timestamp | undefined | null): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalize<T extends DocumentData>(id: string, d: DocumentData): T & { id: string } {
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(d)) {
    if (v instanceof Timestamp) out[k] = v.toDate().toISOString();
    else if (v && typeof v === 'object' && '_seconds' in v && '_nanoseconds' in v) {
      out[k] = new Date((v as { _seconds: number })._seconds * 1000).toISOString();
    } else {
      out[k] = v;
    }
  }
  return out as T & { id: string };
}

/* ============================================================
 * FUNÇÕES PARA O PAINEL ADMINISTRATIVO (ACESSO AMPLO)
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

export async function createPerfil(uid: string, p: Omit<Perfil, 'id' | 'criado_em' | 'atualizado_em'>): Promise<void> {
  await setDoc(doc(db, 'perfis', uid), {
    ...p,
    cliente_id: p.cliente_id || null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });
}

export async function updatePerfil(
  uid: string,
  dados: Partial<Pick<Perfil, 'nome' | 'telefone' | 'cpf'>>,
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
  await updateDoc(doc(db, 'perfis', uid), { papel, atualizado_em: serverTimestamp() });
}

export async function deletePerfil(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'perfis', uid));
}

export async function listClientes(): Promise<Cliente[]> {
  return list<Cliente>('clientes', [orderBy('criado_em', 'desc')]);
}

export async function findClienteByEmail(email: string): Promise<Cliente | null> {
  const arr = await list<Cliente>('clientes', [where('email', '==', email), limit(1)]);
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
    foto_url: null, // A foto é adicionada em uma segunda etapa, se houver
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
  const arr = await list<Processo>('processos', [where('cliente_id', '==', clienteId)]);
  return arr.sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
}

export async function listProcessosByAdvogado(advogadoId: string): Promise<Processo[]> {
  const arr = await list<Processo>('processos', [where('advogado_id', '==', advogadoId)]);
  return arr.sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
}

export async function getProcesso(id: string): Promise<Processo | null> {
  return one<Processo>('processos', id);
}

export async function createProcesso(p: Omit<Processo, 'id' | 'criado_em' | 'atualizado_em'>): Promise<string> {
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

export async function updateStatusProcesso(id: string, status: StatusProcesso): Promise<void> {
  await updateProcesso(id, { status });
}

export async function listMovimentacoes(processoId: string): Promise<Movimentacao[]> {
  const arr = await list<Movimentacao>('movimentacoes', [where('processo_id', '==', processoId)]);
  return arr.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

export async function createMovimentacao(m: Omit<Movimentacao, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'movimentacoes'), { ...m, criado_em: serverTimestamp() });
  return ref.id;
}

export async function deleteMovimentacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'movimentacoes', id));
}

export async function listDocumentos(processoId: string): Promise<Documento[]> {
  const arr = await list<Documento>('documentos', [where('processo_id', '==', processoId)]);
  return arr.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

export async function createDocumento(d: Omit<Documento, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'documentos'), { ...d, criado_em: serverTimestamp() });
  return ref.id;
}

export async function deleteDocumento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'documentos', id));
}

export async function createMensagem(m: Omit<Mensagem, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'mensagens'), { ...m, criado_em: serverTimestamp() });
  // Cria notificação para o destinatário em segundo plano (não bloqueia a resposta ao usuário)
  void agendarNotificacaoMensagem({ ...m, id: ref.id }).catch((e) =>
    console.error('Falha ao criar notificação de mensagem:', e),
  );
  return ref.id;
}

export async function marcarMensagemLida(id: string): Promise<void> {
  await updateDoc(doc(db, 'mensagens', id), { lida: true });
}

export async function listMensagensNaoLidas(maxCount = 5): Promise<Mensagem[]> {
  const arr = await list<Mensagem>('mensagens', [where('lida', '==', false)]);
  return arr
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, maxCount);
}

export async function listCompromissos(): Promise<Compromisso[]> {
  return list<Compromisso>('compromissos', [orderBy('data_hora', 'asc')]);
}

export async function listCompromissosByProcesso(processoId: string): Promise<Compromisso[]> {
  const arr = await list<Compromisso>('compromissos', [where('processo_id', '==', processoId)]);
  return arr.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
}

export async function listProximosCompromissos(maxCount = 5): Promise<Compromisso[]> {
  const agora = Timestamp.now();
  return list<Compromisso>('compromissos', [
    where('data_hora', '>=', agora),
    orderBy('data_hora', 'asc'),
    limit(maxCount),
  ]);
}

export async function createCompromisso(c: Omit<Compromisso, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'compromissos'), {
    ...c,
    data_hora: Timestamp.fromDate(new Date(c.data_hora)),
    criado_em: serverTimestamp(),
  });
  // Cria notificações para o advogado e/ou cliente em segundo plano (não bloqueia)
  void agendarNotificacaoCompromisso({ ...c, id: ref.id }).catch((e) =>
    console.error('Falha ao criar notificação de compromisso:', e),
  );
  return ref.id;
}

export async function deleteCompromisso(id: string): Promise<void> {
  await deleteDoc(doc(db, 'compromissos', id));
}

export async function updateCompromisso(id: string, dados: Partial<Compromisso>): Promise<void> {
  await updateDoc(doc(db, 'compromissos', id), dados);
}

/* ============================================================
 * AREAS ATUACAO (CMS publico)
 * ============================================================ */
export async function listAreasAtuacao(apenasAtivas = false): Promise<AreaAtuacao[]> {
  const todos = await list<AreaAtuacao>('areas_atuacao', [orderBy('ordem', 'asc')]);
  return apenasAtivas ? todos.filter((a) => a.ativo) : todos;
}

export async function createAreaAtuacao(a: Omit<AreaAtuacao, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'areas_atuacao'), { ...a, criado_em: serverTimestamp() });
  return ref.id;
}

export async function updateAreaAtuacao(id: string, dados: Partial<AreaAtuacao>): Promise<void> {
  await updateDoc(doc(db, 'areas_atuacao', id), dados);
}

export async function deleteAreaAtuacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'areas_atuacao', id));
}

/* ============================================================
 * DEPOIMENTOS (CMS publico)
 * ============================================================ */
export async function listDepoimentos(apenasAtivos = false): Promise<Depoimento[]> {
  const todos = await list<Depoimento>('depoimentos', [orderBy('ordem', 'asc')]);
  return apenasAtivos ? todos.filter((d) => d.ativo) : todos;
}

export async function createDepoimento(d: Omit<Depoimento, 'id' | 'criado_em'>): Promise<string> {
  const ref = await addDoc(collection(db, 'depoimentos'), { ...d, criado_em: serverTimestamp() });
  return ref.id;
}

export async function updateDepoimento(id: string, dados: Partial<Depoimento>): Promise<void> {
  await updateDoc(doc(db, 'depoimentos', id), dados);
}

export async function deleteDepoimento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'depoimentos', id));
}

/* ============================================================
 * CONTEUDO SITE (CMS chave/valor)
 * ============================================================ */
export async function getConteudoSite(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'conteudo_site'));
  const map: Record<string, string> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as { chave: string; valor: string };
    map[data.chave] = data.valor;
  });
  return map;
}

export async function upsertConteudoSite(chave: string, valor: string): Promise<void> {
  await setDoc(doc(db, 'conteudo_site', chave), {
    chave,
    valor,
    atualizado_em: serverTimestamp(),
  });
}

export async function listLogsAcesso(maxCount = 200): Promise<LogAcesso[]> {
  return list<LogAcesso>('logs_acesso', [orderBy('criado_em', 'desc'), limit(maxCount)]);
}

/* =============================================================
 * NOTIFICAÇÕES (alertas em segundo plano)
 *
 * Criadas automaticamente pelo sistema quando:
 * - Um compromisso é agendado  → notifica advogado + cliente
 * - Uma mensagem é enviada      → notifica o destinatário
 * - O verificador de lembretes encontra compromissos
 *   próximos sem lembrete ainda → cria lembrete e marca
 *   `lembrete_enviado = true`
 *
 * O processamento "em segundo plano" é feito pelo
 * NotificacaoProvider (setInterval) enquanto o usuário
 * está autenticado na aplicação.
 * ============================================================ */

const LIMITE_LEMBRETE_HORAS = 24;

export async function createNotificacao(
  n: Omit<Notificacao, 'id' | 'criado_em' | 'atualizado_em' | 'lida' | 'push_enviado' | 'push_enviado_em'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'notificacoes'), {
    ...n,
    lida: false,
    push_enviado: false,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });
  return ref.id;
}

export async function listNotificoes(destinatarioId: string): Promise<Notificacao[]> {
  return list<Notificacao>('notificacoes', [
    where('destinatario_id', '==', destinatarioId),
    orderBy('criado_em', 'desc'),
    limit(100),
  ]);
}

export async function listNotificoesNaoLidas(
  destinatarioId: string,
  maxCount = 50,
): Promise<Notificacao[]> {
  return list<Notificacao>('notificacoes', [
    where('destinatario_id', '==', destinatarioId),
    where('lida', '==', false),
    orderBy('criado_em', 'desc'),
    limit(maxCount),
  ]);
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
  await updateDoc(doc(db, 'notificacoes', id), { lida: true, atualizado_em: serverTimestamp() });
}

export async function marcarNotificoesLidasTodas(destinatarioId: string): Promise<void> {
  const arr = await listNotificoesNaoLidas(destinatarioId, 1000);
  await Promise.all(arr.map((n) => marcarNotificaoLida(n.id)));
}

export async function deleteNotificacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notificacoes', id));
}

/** Remove notificações lidas mais antigas que `dias` dias (limpeza em segundo plano). */
export async function limparNotificoesAntigas(dias = 30): Promise<number> {
  const corte = new Date();
  corte.setDate(corte.getDate() - dias);
  const snap = await getDocs(
    query(
      collection(db, 'notificacoes'),
      where('criado_em', '<=', Timestamp.fromDate(corte)),
      where('lida', '==', true),
      limit(500),
    ),
  );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
}

/* -------------------------------------------------------------
 * PUSH TOKENS (alertas com o app fechado)
 *
 * O token FCM de cada navegador/PWA é salvo em `push_tokens/{token}`
 * para que o servidor `scripts/monitor-alertas.mjs` envie as
 * notificações mesmo quando o aplicativo está fechado.
 * ------------------------------------------------------------- */

export async function salvarPushToken(uid: string, token: string): Promise<void> {
  await setDoc(
    doc(db, 'push_tokens', token),
    {
      uid,
      dispositivo:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp(),
    },
    { merge: true },
  );
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

/** Coleta todos os destinatários de um compromisso (advogado + cliente via user_id). */
async function destinatariosCompromisso(
  c: Omit<Compromisso, 'criado_em'> & { processo?: Processo | null; id?: string },
): Promise<Set<string>> {
  const processo = c.processo ?? (c.processo_id ? await getProcesso(c.processo_id) : null);
  if (!processo) return new Set();

  const cliente = await getCliente(processo.cliente_id);
  const dest = new Set<string>();
  if (processo.advogado_id) dest.add(processo.advogado_id);
  if (cliente?.user_id) dest.add(cliente.user_id);
  return dest;
}

/** Cria notificações imediatas quando um compromisso é agendado. */
export async function agendarNotificacaoCompromisso(
  c: Omit<Compromisso, 'criado_em'> & { processo?: Processo | null; id?: string },
): Promise<void> {
  const dest = await destinatariosCompromisso(c);
  if (dest.size === 0) return;

  const titulo = `Compromisso: ${c.titulo}`;
  const texto = `Você tem um(a) ${TIPO_COMPROMISSO_LABEL[c.tipo].toLowerCase()} agendado(a) para ${formatarDataHora(c.data_hora)}.`;

  await Promise.all(
    [...dest].map((uid) =>
      createNotificacao({
        destinatario_id: uid,
        titulo,
        mensagem: texto,
        tipo: 'compromisso',
        origem_id: c.id ?? null,
        origem_tipo: 'compromisso',
      }),
    ),
  );
}

/** Cria uma notificação para o destinatário quando uma mensagem é enviada. */
export async function agendarNotificacaoMensagem(
  m: Omit<Mensagem, 'criado_em'> & { id?: string },
): Promise<void> {
  const processo = await getProcesso(m.processo_id);
  if (!processo) return;

  const cliente = await getCliente(processo.cliente_id);

  let destinatarioId: string | null = null;
  if (cliente?.user_id === m.remetente_id) {
    // Mensagem do cliente → notifica o advogado
    destinatarioId = processo.advogado_id;
  } else {
    // Mensagem do advogado/admin → notifica o cliente
    destinatarioId = cliente?.user_id ?? null;
  }

  if (!destinatarioId) return;

  const titulo = 'Nova mensagem';
  const texto =
    cliente?.user_id === m.remetente_id
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

/**
 * Verificador de lembretes em segundo plano.
 *
 * Busca compromissos futuros (até LIMITE_LEMBRETE_HORAS à frente)
 * sem lembrete enviado, cria notificações de lembrete para todos os
 * interessados e marca `lembrete_enviado = true` no compromisso.
 *
 * Executado periodicamente pelo NotificacaoProvider enquanto o
 * usuário está autenticado.
 */
export async function verificarLembretesCompromissos(): Promise<number> {
  const agora = Date.now();
  const limite = new Date(agora + LIMITE_LEMBRETE_HORAS * 3600 * 1000);

  const arr = await list<Compromisso>('compromissos', [
    where('data_hora', '>=', Timestamp.fromDate(new Date(agora))),
    where('data_hora', '<=', Timestamp.fromDate(limite)),
    where('lembrete_enviado', '==', false),
    orderBy('data_hora', 'asc'),
    limit(50),
  ]);

  let count = 0;
  for (const c of arr) {
    try {
      await criarNotificacaoLembrete(c);
      await updateCompromisso(c.id, { lembrete_enviado: true });
      count++;
    } catch {
      // Ignora erros individuais sem interromper o loop
    }
  }
  return count;
}

/** Cria notificações de lembrete para um compromisso específico. */
async function criarNotificacaoLembrete(
  c: Compromisso & { processo?: Processo | null },
): Promise<void> {
  const dest = await destinatariosCompromisso(c);
  if (dest.size === 0) return;

  const titulo = `Lembrete: ${c.titulo}`;
  const texto = `Sua ${TIPO_COMPROMISSO_LABEL[c.tipo].toLowerCase()} está próxima. Data/hora: ${formatarDataHora(c.data_hora)}.`;

  await Promise.all(
    [...dest].map((uid) =>
      createNotificacao({
        destinatario_id: uid,
        titulo,
        mensagem: texto,
        tipo: 'lembrete',
        origem_id: c.id ?? null,
        origem_tipo: 'compromisso',
      }),
    ),
  );
}

/* ============================================================
 * HELPERS DE JOIN (ADMIN)
 * ============================================================ */

export async function getProcessoComCliente(id: string): Promise<(Processo & { cliente: Cliente | null }) | null> {
  const p = await getProcesso(id);
  if (!p) return null;
  const c = await getCliente(p.cliente_id);
  return { ...p, cliente: c };
}

export async function listProcessosComClientes(): Promise<(Processo & { cliente: Cliente | null })[]> {
  const [procs, clients] = await Promise.all([listProcessos(), listClientes()]);
  const map = new Map(clients.map((c) => [c.id, c]));
  return procs.map((p) => ({ ...p, cliente: map.get(p.cliente_id) ?? null }));
}

export async function listClientesComProcessos(): Promise<(Cliente & { processos: Processo[] })[]> {
  const [clients, procs] = await Promise.all([listClientes(), listProcessos()]);
  const byClient = new Map<string, Processo[]>();
  procs.forEach((p) => {
    const arr = byClient.get(p.cliente_id) ?? [];
    arr.push(p);
    byClient.set(p.cliente_id, arr);
  });
  return clients.map((c) => ({ ...c, processos: byClient.get(c.id) ?? [] }));
}

export async function listCompromissosComProcessos(): Promise<(Compromisso & { processo: Processo | null })[]> {
  const [comps, procs] = await Promise.all([listCompromissos(), listProcessos()]);
  const map = new Map(procs.map((p) => [p.id, p]));
  return comps.map((c) => ({ ...c, processo: c.processo_id ? map.get(c.processo_id) ?? null : null }));
}

/* ============================================================
 * VISÃO POR PAPEL (admin x advogado)
 * O advogado enxerga apenas os próprios processos (advogado_id
 * igual ao uid dele) e tudo que está vinculado a eles: clientes,
 * agenda e mensagens. O admin continua enxergando tudo.
 * ============================================================ */

export async function listProcessosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<Processo[]> {
  if (papel === 'advogado') return listProcessosByAdvogado(uid);
  return listProcessos();
}

export async function listClientesByAdvogado(uid: string): Promise<Cliente[]> {
  return list<Cliente>('clientes', [where('advogado_id', '==', uid)]);
}

export async function listClientesVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<Cliente[]> {
  if (papel !== 'advogado') return listClientes();

  // Advogado vê os clientes dos processos que estão com ele + os clientes que ele criou.
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
  if (papel !== 'advogado') return listProcessosComClientes();

  const procs = await listProcessosByAdvogado(uid);
  const clientes = await listClientesVisiveis('advogado', uid);
  const map = new Map(clientes.map((c) => [c.id, c]));
  return procs.map((p) => ({ ...p, cliente: map.get(p.cliente_id) ?? null }));
}

export async function listClientesComProcessosVisiveis(
  papel: Papel | null | undefined,
  uid: string,
): Promise<(Cliente & { processos: Processo[] })[]> {
  if (papel !== 'advogado') return listClientesComProcessos();

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
  return clients.map((c) => ({ ...c, processos: byClient.get(c.id) ?? [] }));
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
    // Advogado vê os compromissos dele + os compromissos gerais (sem vínculo).
    return all
      .filter((c) => !c.processo_id || procIds.has(c.processo_id))
      .map((c) => ({ ...c, processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null }));
  }

  return all.map((c) => ({ ...c, processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null }));
}

export async function listMensagensNaoLidasVisiveis(
  papel: Papel | null | undefined,
  uid: string,
  maxCount = 5,
): Promise<Mensagem[]> {
  if (papel !== 'advogado') return listMensagensNaoLidas(maxCount);

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
  if (papel !== 'advogado') return listProximosCompromissos(maxCount);

  const procs = await listProcessosByAdvogado(uid);
  const procIds = new Set(procs.map((p) => p.id));
  const all = await listProximosCompromissos(500);
  return all.filter((c) => !c.processo_id || procIds.has(c.processo_id)).slice(0, maxCount);
}

export async function listProcessosByClienteVisivel(
  papel: Papel | null | undefined,
  uid: string,
  clienteId: string,
): Promise<Processo[]> {
  if (papel === 'advogado') {
    // Consulta pelos processos do próprio advogado (filtro coberto pelas regras)
    // e filtra pelo cliente em memória.
    const procs = await listProcessosByAdvogado(uid);
    return procs
      .filter((p) => p.cliente_id === clienteId)
      .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
  }
  return listProcessosByCliente(clienteId);
}

export async function listCompromissosByClienteVisivel(
  papel: Papel | null | undefined,
  uid: string,
  clienteId: string,
): Promise<(Compromisso & { processo: Processo | null })[]> {
  if (papel === 'advogado') {
    return listCompromissosByProcessos(await listProcessosByClienteVisivel(papel, uid, clienteId));
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
    const procIds = procs.map((p) => p.id);
    const all: Mensagem[] = [];
    for (const pid of procIds) {
      all.push(...(await listMensagens(pid)));
    }
    all.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    return all.map((m) => ({ ...m, processo: m.processo_id ? procMap.get(m.processo_id) ?? null : null }));
  }
  return listMensagensByCliente(clienteId);
}

/** Agrupa compromissos pelos processos informados (com os dados do processo). */
async function listCompromissosByProcessos(
  procs: Processo[],
): Promise<(Compromisso & { processo: Processo | null })[]> {
  if (procs.length === 0) return [];
  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = procs.map((p) => p.id);
  const all = await list<Compromisso>('compromissos', [orderBy('data_hora', 'asc')]);
  return all
    .filter((c) => c.processo_id && procIds.includes(c.processo_id))
    .map((c) => ({ ...c, processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null }));
}

export async function listCompromissosByCliente(
  clienteId: string,
): Promise<(Compromisso & { processo: Processo | null })[]> {
  const procs = await listProcessosByCliente(clienteId);
  if (procs.length === 0) return [];
  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = procs.map((p) => p.id);
  const all = await list<Compromisso>('compromissos', [orderBy('data_hora', 'asc')]);
  return all
    .filter((c) => c.processo_id && procIds.includes(c.processo_id))
    .map((c) => ({ ...c, processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null }));
}

export async function listMensagens(processoId: string): Promise<Mensagem[]> {
  const arr = await list<Mensagem>('mensagens', [where('processo_id', '==', processoId)]);
  return arr.sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());
}

export async function listMensagensByCliente(
  clienteId: string,
): Promise<(Mensagem & { processo: Processo | null })[]> {
  const procs = await listProcessosByCliente(clienteId);
  if (procs.length === 0) return [];
  const procMap = new Map(procs.map((p) => [p.id, p]));
  const procIds = procs.map((p) => p.id);
  const all: Mensagem[] = [];
  for (const pid of procIds) {
    const msgs = await listMensagens(pid);
    all.push(...msgs);
  }
  all.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  return all.map((m) => ({ ...m, processo: m.processo_id ? procMap.get(m.processo_id) ?? null : null }));
}

/* ============================================================
 * FUNÇÕES PARA O PORTAL DO CLIENTE (ACESSO RESTRITO)
 * ============================================================ */

async function findClienteByUserId(userId: string): Promise<Cliente | null> {
  const arr = await list<Cliente>('clientes', [where('user_id', '==', userId), limit(1)]);
  return arr[0] ?? null;
}

export const cliente = {
  async getPerfil(uid: string): Promise<Perfil | null> {
    // O cliente só pode ver o próprio perfil.
    return one<Perfil>('perfis', uid);
  },

  async updatePerfil(
    uid: string,
    dados: Partial<Pick<Perfil, 'nome' | 'telefone'>> & { foto_url?: string | null },
  ): Promise<void> {
    // O cliente só pode atualizar o próprio perfil.
    await updateDoc(doc(db, 'perfis', uid), {
      ...dados,
      atualizado_em: serverTimestamp(),
    });

    // Também atualiza o documento do cliente correspondente para manter a consistência.
    const p = await this.getPerfil(uid);
    if (p?.cliente_id) {
      // Remove foto_url do payload para não dar erro no tipo
      const { foto_url, ...dadosCliente } = dados;
      await updateCliente(p.cliente_id, { ...dadosCliente, foto_url: foto_url || undefined });
    }
  },

  async listProcessos(userId: string): Promise<Processo[]> {
    const cliente = await findClienteByUserId(userId);
    if (!cliente) return [];
    return listProcessosByCliente(cliente.id);
  },

  async getProcesso(userId: string, processoId: string): Promise<Processo | null> {
    const cliente = await findClienteByUserId(userId);
    if (!cliente) return null;
    const processo = await one<Processo>('processos', processoId);
    // Confirma que o processo pertence ao cliente.
    if (processo?.cliente_id !== cliente.id) return null;
    return processo;
  },

  async listMovimentacoes(userId: string, processoId: string): Promise<Movimentacao[]> {
    const processo = await this.getProcesso(userId, processoId);
    if (!processo) return []; // Se não tem acesso ao processo, não vê as movimentações.
    return listMovimentacoes(processoId);
  },

  async listDocumentos(userId: string, processoId: string): Promise<Documento[]> {
    const processo = await this.getProcesso(userId, processoId);
    if (!processo) return [];
    return listDocumentos(processoId);
  },

  async createDocumento(userId: string, d: Omit<Documento, 'id' | 'criado_em'>): Promise<string> {
    const processo = await this.getProcesso(userId, d.processo_id);
    if (!processo) throw new Error('Permissão negada');
    return createDocumento({ ...d, enviado_por_id: userId });
  },

  async listMensagens(userId: string, processoId: string): Promise<Mensagem[]> {
    const processo = await this.getProcesso(userId, processoId);
    if (!processo) return [];
    return listMensagens(processoId);
  },

      async createMensagem(userId: string, m: Omit<Mensagem, 'id' | 'criado_em'>): Promise<string> {
    const processo = await this.getProcesso(userId, m.processo_id);
    if (!processo) throw new Error('Permissão negada');
    const ref = await addDoc(collection(db, 'mensagens'), { ...m, criado_em: serverTimestamp() });
    // Notifica o destinatário em segundo plano (não bloqueia a resposta)
    void agendarNotificacaoMensagem({ ...m, id: ref.id }).catch((e) =>
      console.error('Falha ao criar notificação de mensagem:', e),
    );
    return ref.id;
  },

  async listCompromissos(userId: string): Promise<(Compromisso & { processo: Processo | null })[]> {
    const procs = await this.listProcessos(userId);
    if (procs.length === 0) return [];
    const procIds = procs.map((p) => p.id);
    const agora = Timestamp.now();
    const all = await list<Compromisso>('compromissos', [
      where('data_hora', '>=', agora),
      orderBy('data_hora', 'asc'),
    ]);
    const procMap = new Map(procs.map((p) => [p.id, p]));
    return all
      .filter((c) => c.processo_id && procIds.includes(c.processo_id))
      .map((c) => ({ ...c, processo: c.processo_id ? procMap.get(c.processo_id) ?? null : null }));
  },

  async createLogAcesso(log: Omit<LogAcesso, 'id' | 'criado_em'>): Promise<void> {
    await addDoc(collection(db, 'logs_acesso'), { ...log, criado_em: serverTimestamp() });
  },

  async createConsentimentoLgpd(user_id: string): Promise<void> {
    await addDoc(collection(db, 'consentimentos_lgpd'), {
      user_id, versao_termos: '1.0', consentiu: true, criado_em: serverTimestamp(),
    });
  },
};

export { toTimestamp, serverTimestamp, Timestamp };
export type { Papel, StatusProcesso, TipoCompromisso, TipoDocumento, CanalMensagem, Notificacao, TipoNotificacao };
