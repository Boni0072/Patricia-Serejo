/**
 * Integração com FCM (Firebase Cloud Messaging) para alertas
 * SONOROS e VISUAIS mesmo com o aplicativo fechado.
 *
 * - Registra o Service Worker `/sw.js`, solicita permissão e obtém um
 *   token de inscrição para o navegador/dispositivo.
 * - Salva o token no Firestore (`push_tokens/{token}`) para que o servidor
 *   `scripts/monitor-alertas.mjs` possa enviar os pushs em segundo plano.
 * - Entrega em primeiro plano é repassada ao app (toast + som via
 *   NotificacaoContext); entrega em segundo plano é feita pelo
 *   Service Worker (notificação do sistema).
 *
 * Se o FCM não estiver configurado (falta `VITE_FIREBASE_VAPID_KEY`),
 * tudo continua funcionando de forma degradada: o sistema mantém o alerta
 * sonoro/visual enquanto o app está aberto (polling de 30s).
 */
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { app } from './firebaseClient';
import * as db from './db';

const chaveVapid = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let messagingCache: Messaging | null | undefined;
let tokenAtualCache: string | null = null;

/** Indica se o FCM está configurado no ambiente. */
export function pushConfigurado(): boolean {
  return Boolean(chaveVapid);
}

function obterMessaging(): Messaging | null {
  if (!pushConfigurado()) return null;
  if (messagingCache === undefined) {
    try {
      messagingCache = getMessaging(app);
    } catch (e) {
      console.warn('[push] FCM indisponível neste navegador:', e);
      messagingCache = null;
    }
  }
  return messagingCache;
}

async function obterRegistroSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existente = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existente) return existente;
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('[push] Falha ao registrar o service worker:', e);
    return null;
  }
}

/**
 * Solicita permissão, inscreve o dispositivo no FCM e guarda o token no
 * Firestore para o servidor de push (`scripts/monitor-alertas.mjs`).
 */
export async function ativarAlertasPush(
  uid: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (typeof window === 'undefined') return { ok: false, erro: 'Ambiente sem suporte.' };
  if (!pushConfigurado()) {
    return { ok: false, erro: 'Push não configurado (falta VITE_FIREBASE_VAPID_KEY no .env).' };
  }
  if (!('Notification' in window)) {
    return { ok: false, erro: 'Seu navegador não suporta notificações push.' };
  }
  if (Notification.permission === 'denied') {
    return { ok: false, erro: 'Notificações bloqueadas. Libere nas configurações do navegador.' };
  }
  if (Notification.permission === 'default') {
    const resposta = await Notification.requestPermission();
    if (resposta !== 'granted') {
      return { ok: false, erro: 'Permissão de notificações não concedida.' };
    }
  }

  const messaging = obterMessaging();
  if (!messaging) return { ok: false, erro: 'FCM indisponível neste navegador.' };

  const sw = await obterRegistroSW();
  if (!sw) return { ok: false, erro: 'Falha ao registrar o service worker de notificações.' };

  try {
    const token = await getToken(messaging, {
      vapidKey: chaveVapid,
      serviceWorkerRegistration: sw,
    });
    if (!token) return { ok: false, erro: 'Não foi possível obter o token de push.' };
    tokenAtualCache = token;
    await db.salvarPushToken(uid, token);
    return { ok: true };
  } catch (e) {
    console.warn('[push] Erro ao registrar o token:', e);
    return { ok: false, erro: 'Erro ao ativar as notificações push. Tente novamente.' };
  }
}

/** Remove o token do dispositivo (logout / desativação manual). */
export async function desativarAlertasPush(uid: string): Promise<void> {
  try {
    const messaging = obterMessaging();
    if (tokenAtualCache) {
      await db.removerPushToken(tokenAtualCache);
      tokenAtualCache = null;
    } else {
      // Garante que nenhum token órfão do usuário permaneça no Firestore.
      await db.removerPushTokensDoUsuario(uid);
    }
    if (messaging) await deleteToken(messaging).catch(() => null);
  } catch (e) {
    console.warn('[push] Falha ao remover o token:', e);
  }
}

export interface DadosMensagemPush {
  titulo?: string;
  mensagem?: string;
  tipo?: 'mensagem' | 'compromisso' | 'lembrete';
  notificationId?: string;
  url?: string;
}

/**
 * Recebe mensagens FCM enquanto o app está aberto em primeiro plano.
 * Retorna uma função para cancelar a escuta.
 */
export function escutarMensagensForeground(
  callback: (dados: DadosMensagemPush) => void,
): () => void {
  const messaging = obterMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const d = (payload.data ?? {}) as Record<string, string>;
    callback({
      titulo: d.titulo,
      mensagem: d.mensagem,
      tipo: d.tipo as DadosMensagemPush['tipo'],
      notificationId: d.notificationId,
      url: d.url,
    });
  });
}

/**
 * Escuta as mensagens enviadas pelo Service Worker quando um push chega
 * com alguma aba/janela do app aberta — usado para não repetir o alerta
 * sonoro/visual que já foi exibido pelo sistema operacional.
 */
export function observarPushIdsEntregues(
  callback: (notificationId: string) => void,
): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    const msg = event.data as { type?: string; notificationId?: string } | null;
    if (msg?.type === 'push-recebido' && msg.notificationId) {
      callback(msg.notificationId);
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}