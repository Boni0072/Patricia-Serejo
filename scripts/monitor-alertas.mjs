#!/usr/bin/env node
/**
 * █████████████████████████████████████████████████████████████████
 *  MONITOR DE ALERTAS PUSH (mensagens + agenda)
 * █████████████████████████████████████████████████████████████████
 *
 * Entrega as notificações SONORAS e VISUAIS mesmo quando o
 * aplicativo está FECHADO:
 *
 *   1. Observa a coleção `notificacoes` (novas mensagens e
 *      compromissos agendados criados pelo app) e dispara o
 *      push via FCM para todos os tokens do destinatário;
 *   2. Gera lembretes dos compromissos das próximas 24h que ainda
 *      não receberam lembrete (funciona sem ninguém logado) e
 *      envia o push;
 *   3. Remove tokens inválidos e faz "backfill" se o servidor
 *      ficou um tempo parado.
 *
 * REQUISITOS
 *   • Habilitar o FCM (Web Push) no Console Firebase
 *     (Engrenagem → Cloud Messaging) e colar a chave VAPID no
 *     .env  do app (VITE_FIREBASE_VAPID_KEY).
 *   • Gerar o arquivo de credenciais do Admin SDK
 *     (Console → Project settings → Service accounts →
 *      Generate new private key) e salvar como
 *     `firebase-service-account.json` na raiz do projeto.
 *
 * USO
 *   node scripts/monitor-alertas.mjs               # modo contínuo (watcher)
 *   node scripts/monitor-alertas.mjs --once        # processa 1x e encerra
 *   node scripts/monitor-alertas.mjs --teste <uid> # push de teste p/ usuário
 *
 * AMBIENTE
 *   FIREBASE_SERVICE_ACCOUNT  caminho do JSON do Admin SDK
 *                             (padrão: ./firebase-service-account.json)
 *   APP_BASE_URL              URL pública do app, usada no clique da
 *                             notificação (padrão: http://localhost:5173)
 * █████████████████████████████████████████████████████████████████
 */
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const somenteUmaVez = args.includes('--once');
const indiceTeste = args.indexOf('--teste');
const uidTeste = indiceTeste >= 0 ? args[indiceTeste + 1] : null;

/* ---------- Configuração ---------- */
const caminhoCredenciais = process.env.FIREBASE_SERVICE_ACCOUNT
  ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT)
  : path.join(raiz, 'firebase-service-account.json');

const BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const LEMBRETE_HORAS = 24;               // lembretes até 24h antes
const JANELA_BACKFILL_HORAS = 48;        // recupera pushs perdidos das últimas 48h
const INTERVALO_CICLO_MS = 5 * 60 * 1000; // lembretes + backfill a cada 5 min

const TIPO_COMPROMISSO_LABEL = {
  audiencia: 'audiência',
  reuniao: 'reunião',
  prazo: 'prazo',
  outro: 'compromisso',
};

const CODIGOS_TOKEN_INVALIDO = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

/* ---------- Firebase Admin ---------- */
if (!existsSync(caminhoCredenciais)) {
  console.error('\n[alertas] Arquivo de credenciais não encontrado:', caminhoCredenciais);
  console.error('[alertas] Gere um Service Account JSON no console do Firebase e salve-o em firebase-service-account.json\n');
  process.exit(1);
}

let credencial;
try {
  credencial = JSON.parse(readFileSync(caminhoCredenciais, 'utf8'));
} catch (e) {
  console.error('[alertas] Falha ao ler as credenciais:', e.message);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(credencial) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

/* ---------- Estado ---------- */
const jaVistos = new Set();    // ids de notificações já tratados nesta execução
const processando = new Set(); // ids em processamento (evita fila duplicada)
const rotasCache = new Map();  // uid -> { url, expira }
let sincronizado = false;      // watcher pronto (ignora o snapshot inicial)
let totalEntregues = 0;

/* ---------- Utilitários ---------- */
function log(...partes) {
  console.log(`[${new Date().toISOString()}]`, ...partes);
}

async function tokensDoUsuario(uid) {
  const snap = await db.collection('push_tokens').where('uid', '==', uid).limit(300).get();
  return snap.docs.map((d) => d.id);
}

async function apagarToken(token) {
  try {
    await db.collection('push_tokens').doc(token).delete();
  } catch {
    /* token já removido */
  }
}

/** Define a URL de destino do clique da notificação conforme o papel. */
async function rotaParaUsuario(uid, tipo) {
  const agora = Date.now();
  const cacheado = rotasCache.get(uid);
  if (cacheado && cacheado.expiraEm > agora) return cacheado.url;

  let papel = 'cliente';
  try {
    const perfil = await db.collection('perfis').doc(uid).get();
    if (perfil.exists) papel = perfil.data().papel ?? 'cliente';
  } catch {
    /* segue como cliente */
  }

  const prefixo = papel === 'cliente' ? '/portal' : '/admin';
  const pagina =
    tipo === 'mensagem'
      ? '/mensagens'
      : tipo === 'compromisso' || tipo === 'lembrete'
        ? '/agenda'
        : '/dashboard';
  const url = `${BASE_URL}${prefixo}${pagina}`;
  rotasCache.set(uid, { url, expiraEm: agora + 10 * 60 * 1000 });
  return url;
}

/* ---------- Envio do push via FCM ---------- */
/**
 * Envia o push para todos os dispositivos de um usuário.
 * Retorna `{ entregues, falhas }` — entregues = tokens que receberam,
 * falhas = erros fora de token-inválido (podem ser temporários).
 */
async function enviarParaUsuario(uid, notificacao) {
  const tokens = await tokensDoUsuario(uid);
  if (tokens.length === 0) return { entregues: 0, falhas: 0 };

  const urlBackend = await rotaParaUsuario(uid, notificacao.tipo);
  const mensagens = tokens.map((token) => ({
    token,
    // Payload `data` (apenas strings) — o service worker é quem exibe a
    // notificação (som/vibração), garantindo comportamento igual em todos
    // os navegadores.
    data: {
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      tipo: notificacao.tipo,
      notificationId: notificacao.id,
      url: notificacao.url ?? urlBackend,
    },
    webpush: {
      headers: { TTL: '86400' }, // 24h: entrega mesmo com o dispositivo offline
    },
  }));

  const resultados = await Promise.allSettled(
    mensagens.map((m) => admin.messaging().send(m)),
  );

  let entregues = 0;
  let falhas = 0;
  for (let i = 0; i < mensagens.length; i++) {
    const resultado = resultados[i];
    if (resultado.status === 'fulfilled') {
      entregues += 1;
    } else {
      const codigo = resultado.reason?.code ?? '';
      if (CODIGOS_TOKEN_INVALIDO.has(codigo)) {
        log('[push] Removendo token inválido:', codigo);
        await apagarToken(tokens[i]);
      } else {
        falhas += 1;
        console.warn(
          '[push] Falha no envio (será tentado no backfill):',
          codigo,
          resultado.reason?.message,
        );
      }
    }
  }
  return { entregues, falhas };
}

/** Marca a notificação como processada no Firestore. */
async function marcarEnviada(ref) {
  await ref.update({
    push_enviado: true,
    push_enviado_em: FieldValue.serverTimestamp(),
  });
}

async function processarNotificacao(doc) {
  const d = doc.data();
  if (!d.destinatario_id) return;
  try {
    const { entregues, falhas } = await enviarParaUsuario(d.destinatario_id, {
      id: doc.id,
      titulo: d.titulo,
      mensagem: d.mensagem,
      tipo: d.tipo,
    });
    totalEntregues += entregues;
    if (entregues > 0) {
      log(`[push] ${entregues}x → ${d.destinatario_id} — ${d.titulo}`);
    }
    // Falha temporária: deixa push_enviado = false para o backfill tentar de novo.
    if (falhas > 0 && entregues === 0) {
      console.warn('[push] Entrega adiada (falha temporária), retentando no backfill:', doc.id);
      return;
    }
    await marcarEnviada(doc.ref);
  } catch (e) {
    console.warn('[push] Erro ao processar notificação', doc.id, e.message);
  }
}

/* ---------- Lembretes de agenda (próximas 24h) ---------- */
function montarLembrete(titulo, tipo, dataHora) {
  const label = (TIPO_COMPROMISSO_LABEL[tipo] ?? 'compromisso').toLowerCase();
  let data = '';
  if (dataHora instanceof Date) {
    data = dataHora.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (dataHora?.toDate) {
    data = dataHora
      .toDate()
      .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return {
    titulo: `Lembrete: ${titulo}`,
    mensagem: `Sua ${label} está próxima. Data/hora: ${data}.`,
  };
}

/** Monta o conjunto de destinatários de um compromisso (advogado + cliente). */
async function destinatariosDoCompromisso(dadosDoCompromisso) {
  const dest = new Set();
  if (dadosDoCompromisso.advogado_id) dest.add(dadosDoCompromisso.advogado_id);
  if (dadosDoCompromisso.processo_id) {
    try {
      const processo = await db.collection('processos').doc(dadosDoCompromisso.processo_id).get();
      if (processo.exists) {
        const dados = processo.data();
        if (dados.advogado_id) dest.add(dados.advogado_id);
        if (dados.cliente_id) {
          const cliente = await db.collection('clientes').doc(dados.cliente_id).get();
          if (cliente.exists && cliente.data().user_id) dest.add(cliente.data().user_id);
        }
      }
    } catch {
      /* ignora processo inexistente */
    }
  }
  return dest;
}

async function processarLembretes() {
  try {
    const agora = Timestamp.now();
    const limite = Timestamp.fromDate(new Date(Date.now() + LEMBRETE_HORAS * 3600 * 1000));
    const snap = await db
      .collection('compromissos')
      .where('data_hora', '>=', agora)
      .where('data_hora', '<=', limite)
      .where('lembrete_enviado', '==', false)
      .limit(50)
      .get();

    let criados = 0;
    for (const doc of snap.docs) {
      const dados = doc.data();
      const ids = await destinatariosDoCompromisso(dados);
      if (ids.size === 0) continue;

      try {
        await db.runTransaction(async (tx) => {
          const docAtual = await tx.get(doc.ref);
          if (!docAtual.exists || docAtual.data().lembrete_enviado === true) return;
          const { titulo, mensagem } = montarLembrete(
            dados.titulo,
            dados.tipo,
            dados.data_hora,
          );
          for (const uid of ids) {
            tx.set(db.collection('notificacoes').doc(), {
              destinatario_id: uid,
              titulo,
              mensagem,
              tipo: 'lembrete',
              origem_id: doc.id,
              origem_tipo: 'compromisso',
              lida: false,
              push_enviado: false,
              criado_em: FieldValue.serverTimestamp(),
              atualizado_em: FieldValue.serverTimestamp(),
            });
          }
          tx.update(doc.ref, { lembrete_enviado: true });
        });
        criados += 1;
        log(`[agenda] lembrete criado para ${doc.id}`);
      } catch (e) {
        console.warn('[agenda] Não foi possível gerar lembrete', doc.id, e.message);
      }
    }
    if (criados > 0) log(`[agenda] ${criados} lembrete(s) criado(s).`);
  } catch (e) {
    console.warn('[agenda] Erro ao varrer compromissos:', e.message);
  }
}

/* ---------- Backfill (recupera o que ficou parado) ---------- */
async function processarBackfill() {
  try {
    const corte = Timestamp.fromDate(new Date(Date.now() - JANELA_BACKFILL_HORAS * 3600 * 1000));
    const snap = await db
      .collection('notificacoes')
      .where('criado_em', '>=', corte)
      .orderBy('criado_em', 'desc')
      .limit(200)
      .get();

    for (const doc of snap.docs) {
      if (doc.data().push_enviado === true) continue;
      if (jaVistos.has(doc.id) || processando.has(doc.id)) continue;
      processando.add(doc.id);
      await processarNotificacao(doc).finally(() => {
        processando.delete(doc.id);
        jaVistos.add(doc.id);
      });
    }
  } catch (e) {
    console.warn('[backfill] Erro na varredura:', e.message);
  }
}

/* ---------- Watcher em tempo real ---------- */
function iniciarWatcher() {
  const consulta = db.collection('notificacoes').orderBy('criado_em', 'desc').limit(100);

  consulta.onSnapshot(
    async (snap) => {
      if (!sincronizado) {
        // Primeiro snapshot = "histórico". Registramos os ids para não
        // disparar pushes de tudo o que já existia antes do servidor subir.
        snap.forEach((d) => jaVistos.add(d.id));
        sincronizado = true;
        log('[watcher] sincronizado. Monitorando novas notificações...');
        return;
      }

      for (const mudanca of snap.docChanges()) {
        if (mudanca.type !== 'added') continue;
        const doc = mudanca.doc;
        if (jaVistos.has(doc.id) || processando.has(doc.id)) continue;
        processando.add(doc.id);
        processarNotificacao(doc).finally(() => {
          processando.delete(doc.id);
          jaVistos.add(doc.id);
        });
      }
    },
    (erro) => {
      console.warn('[watcher] Falha na conexão com o Firestore:', erro.message);
    },
  );
}

/* ---------- Modo teste ---------- */
async function enviarPushTeste(uid) {
  log(`[teste] Enviando push de teste para ${uid}...`);
  const { entregues } = await enviarParaUsuario(uid, {
    id: `teste-${Date.now()}`,
    titulo: 'Teste de alerta push ✅',
    mensagem: 'Se você recebeu este alerta com o app fechado, o sistema está funcionando.',
    tipo: 'mensagem',
  });
  if (entregues > 0) {
    log(`[teste] Sucesso — ${entregues} dispositivo(s) notificado(s).`);
  } else {
    log('[teste] Nenhum token encontrado para este usuário.');
    process.exitCode = 1;
  }
}

/* ---------- Laço principal ---------- */
async function principal() {
  log('──── Monitor de Alertas iniciado ────');
  log('Projeto:', credencial.project_id);

  if (uidTeste) {
    await enviarPushTeste(uidTeste);
    return;
  }

  if (somenteUmaVez) {
    log('Modo --once: processando lembretes e backfill...');
    await processarLembretes();
    await processarBackfill();
    log(`Total entregue nesta execução: ${totalEntregues}`);
    return;
  }

  iniciarWatcher();

  // Execuções periódicas: lembretes + recuperação de pushs perdidos.
  await processarLembretes();
  await processarBackfill();
  setInterval(() => {
    void processarLembretes();
    void processarBackfill();
  }, INTERVALO_CICLO_MS);

  log('Rodando (Ctrl+C para encerrar).');
}

void principal();