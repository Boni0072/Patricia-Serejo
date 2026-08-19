import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import * as db from '../lib/db';
import * as push from '../lib/push';
import { useAuth } from './AuthContext';
import type { Notificacao } from '../types/database';
import { toast } from '../components/Toast';

interface NotificacaoContextValue {
  notificacoes: Notificacao[];
  naoLidas: Notificacao[];
  countNaoLidas: number;
  loading: boolean;
  marcarComoLida: (id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  removerNotificacao: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Indica se o push (alertas com o app fechado) está ativo. */
  pushAtivo: boolean;
  ativandoPush: boolean;
  ativarAlertasPush: () => Promise<{ ok: boolean; erro?: string }>;
  desativarAlertasPush: () => Promise<void>;
}

const NotificacaoContext = createContext<NotificacaoContextValue | undefined>(undefined);

const INTERVALO_VERIFICACAO = 30000; // 30 segundos

function emitirSinalSonoro() {
  try {
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const ganho = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.12);
    ganho.gain.setValueAtTime(0.0001, audioContext.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
    oscillator.connect(ganho);
    ganho.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator.addEventListener('ended', () => void audioContext.close());
  } catch {
    // O navegador pode bloquear áudio até haver uma interação do usuário.
  }
}

export function NotificacaoProvider({ children }: { children: ReactNode }) {
  const { user, perfil } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [ativandoPush, setAtivandoPush] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cicloRef = useRef(0);
  const inicializadoRef = useRef(false);
  const notificacoesRef = useRef<Notificacao[]>([]);
  // Ids de notificações que já foram entregues via push pelo service worker.
  // Evitam alerta duplicado dentro do app (som + toast) enquanto ele está aberto.
  const idsPushRecentesRef = useRef<Map<string, number>>(new Map());
  const ultimoUidRef = useRef<string | null>(null);

  const alertarNovas = useCallback((novas: Notificacao[]) => {
    const agora = Date.now();
    // Limpa entradas antigas (mais de 3 minutos) para não crescer sem limite.
    for (const [id, ts] of idsPushRecentesRef.current) {
      if (agora - ts > 180000) idsPushRecentesRef.current.delete(id);
    }
    const aindaPendentes = novas.filter((n) => !idsPushRecentesRef.current.has(n.id));
    if (aindaPendentes.length === 0) return;
    emitirSinalSonoro();
    const primeira = aindaPendentes[0];
    toast.info(`${primeira.titulo}: ${primeira.mensagem}`);
  }, []);

  const carregar = useCallback(async () => {
    if (!user) {
      setNotificacoes([]);
      notificacoesRef.current = [];
      inicializadoRef.current = false;
      return;
    }
    setLoading(true);
    try {
      const lista = await db.listNotificoes(user.uid);
      const idsAnteriores = new Set(notificacoesRef.current.map((n) => n.id));
      const novas = inicializadoRef.current
        ? lista.filter((n) => !idsAnteriores.has(n.id) && !n.lida)
        : [];
      setNotificacoes(lista);
      notificacoesRef.current = lista;
      if (novas.length > 0) {
        alertarNovas(novas);
      }
      inicializadoRef.current = true;
    } catch (e) {
      console.error('NotificacaoProvider: erro ao carregar notificações:', e);
    }
    setLoading(false);
  }, [user, alertarNovas]);

  // Carrega notificações quando o usuário muda
  useEffect(() => {
    carregar();
  }, [carregar]);

  // Verificação em segundo plano: lembretes de compromissos + novas mensagens
  useEffect(() => {
    if (!user) return;

    const verificarSegundoPlano = async () => {
      try {
        const papel = perfil?.papel ?? 'admin';

        // 1. Verifica lembretes de compromissos próximos (até 24h)
        //    que ainda não tiveram notificação enviada
        if (papel === 'admin' || papel === 'advogado') {
          const lembretes = await db.verificarLembretesCompromissos();
          if (lembretes > 0) {
            await carregar();
          }
        }

        // Atualiza mensagens e compromissos novos em todos os ciclos.
        await carregar();

        // 2. Limpa notificações antigas lidas (limpeza periódica)
        //    Executa no primeiro ciclo e a cada hora (a cada 120 ciclos)
        cicloRef.current += 1;
        if (cicloRef.current % 120 === 0) {
          void db.limparNotificoesAntigas(30).catch(() => {});
        }
      } catch (e) {
        console.error('NotificacaoProvider: falha na verificação em segundo plano:', e);
      }
    };

    // Executa imediatamente na primeira autenticação
    void verificarSegundoPlano();

    // Agenda execução periódica
    intervaloRef.current = setInterval(verificarSegundoPlano, INTERVALO_VERIFICACAO);

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    };
  }, [user, perfil, carregar]);

  // ---------------------------------------------------------------
  // PUSH — alertas sonoros e visuais mesmo com o aplicativo fechado
  // ---------------------------------------------------------------

  // Observa entregas feitas pelo service worker (app aberto em 2º plano):
  // os ids entram na "memória de deduplicação" para não soar 2x o alerta.
  useEffect(() => {
    const parar = push.observarPushIdsEntregues((id) => {
      idsPushRecentesRef.current.set(id, Date.now());
    });
    return parar;
  }, []);

  // Mensagens FCM entregues em primeiro plano: toca som + toast direto.
  useEffect(() => {
    if (!user) return;
    return push.escutarMensagensForeground((dados) => {
      if (dados.notificationId) {
        idsPushRecentesRef.current.set(dados.notificationId, Date.now());
      }
      if (dados.titulo) {
        emitirSinalSonoro();
        toast.info(`${dados.titulo}: ${dados.mensagem ?? ''}`);
        void carregar();
      }
    });
  }, [user, carregar]);

  // Recarrega imediatamente quando o usuário volta ao app (janela ativa).
  useEffect(() => {
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [carregar]);

  // Ativa o push automaticamente se a permissão já foi concedida antes;
  // remove o token quando o usuário sai.
  useEffect(() => {
    if (!user) {
      if (ultimoUidRef.current) {
        void push.desativarAlertasPush(ultimoUidRef.current);
      }
      ultimoUidRef.current = null;
      setPushAtivo(false);
      return;
    }

    ultimoUidRef.current = user.uid;
    const temSuporte = 'Notification' in window;
    setPushAtivo(temSuporte && Notification.permission === 'granted');

    if (push.pushConfigurado() && temSuporte && Notification.permission === 'granted') {
      void push.ativarAlertasPush(user.uid).then((r) => {
        if (r.ok) setPushAtivo(true);
      });
    }
  }, [user]);

  const naoLidas = notificacoes.filter((n) => !n.lida);

  const ativarAlertas = useCallback(async () => {
    if (!user) return { ok: false, erro: 'Faça login para ativar os alertas.' };
    setAtivandoPush(true);
    const resultado = await push.ativarAlertasPush(user.uid);
    setAtivandoPush(false);
    if (resultado.ok) setPushAtivo(true);
    return resultado;
  }, [user]);

  const desativarAlertas = useCallback(async () => {
    if (!user) return;
    setAtivandoPush(true);
    await push.desativarAlertasPush(user.uid);
    setAtivandoPush(false);
    setPushAtivo(false);
  }, [user]);

  const marcarComoLida = useCallback(async (id: string) => {
    await db.marcarNotificaoLida(id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
    );
  }, []);

  const marcarTodasComoLidas = useCallback(async () => {
    if (!user) return;
    await db.marcarNotificoesLidasTodas(user.uid);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }, [user]);

  const removerNotificacao = useCallback(async (id: string) => {
    await db.deleteNotificacao(id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificacaoContext.Provider
      value={{
        notificacoes,
        naoLidas,
        countNaoLidas: naoLidas.length,
        loading,
        marcarComoLida,
        marcarTodasComoLidas,
        removerNotificacao,
        refresh: carregar,
        pushAtivo,
        ativandoPush,
        ativarAlertasPush: ativarAlertas,
        desativarAlertasPush: desativarAlertas,
      }}
    >
      {children}
    </NotificacaoContext.Provider>
  );
}

export function useNotificacoes() {
  const ctx = useContext(NotificacaoContext);
  if (!ctx) {
    throw new Error('useNotificacoes deve ser usado dentro de NotificacaoProvider');
  }
  return ctx;
}