import { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, Check, Calendar, MessageSquare, Clock, Volume2 } from 'lucide-react';
import { useNotificacoes } from '../context/NotificacaoContext';
import type { Notificacao, TipoNotificacao } from '../types/database';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from './Toast';

const ICONE_TIPO: Record<TipoNotificacao, React.ElementType> = {
  compromisso: Calendar,
  mensagem: MessageSquare,
  lembrete: Clock,
};

const COR_TIPO: Record<TipoNotificacao, string> = {
  compromisso: 'text-brand-700',
  mensagem: 'text-blue-600',
  lembrete: 'text-warning-600',
};

export default function NotificacaoBell() {
  const {
    countNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    notificacoes,
    refresh,
    pushAtivo,
    ativandoPush,
    ativarAlertasPush,
    desativarAlertasPush,
  } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const prefixo = location.pathname.startsWith('/portal') ? '/portal' : '/admin';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const abrirNotificacao = async (n: Notificacao) => {
    await marcarComoLida(n.id);

    // Navega para a página relevante
    if (n.origem_tipo === 'mensagem') {
      navigate(`${prefixo}/mensagens`);
    } else if (n.origem_tipo === 'compromisso') {
      navigate(`${prefixo}/agenda`);
    } else {
      navigate(`${prefixo}/dashboard`);
    }

    setAberto(false);
  };

  const handleMarcarTodas = async () => {
    await marcarTodasComoLidas();
  };

  const handleAtivarPush = async () => {
    const resultado = await ativarAlertasPush();
    if (resultado.ok) {
      toast.sucesso('Alertas ativados! Você será avisado mesmo com o app fechado.');
    } else {
      toast.erro(resultado.erro ?? 'Não foi possível ativar os alertas push.');
    }
  };

  const handleDesativarPush = async () => {
    await desativarAlertasPush();
    toast.info('Alertas push desativados.');
  };

  // Exibe as 10 notificações mais recentes (lidas + não lidas)
  const recentes = notificacoes.slice(0, 10);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => { setAberto(!aberto); if (!aberto) void refresh(); }}
        className="relative p-2 rounded-lg text-ink-500 hover:text-brand-900 hover:bg-brand-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
        aria-label="Notificações"
      >
        {countNaoLidas > 0 ? (
          <BellRing size={20} className="text-gold-500" />
        ) : (
          <Bell size={20} />
        )}
        {countNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white px-[3px]">
            {countNaoLidas > 99 ? '99+' : countNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-ink-100 py-2 z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-2 pb-2 border-b border-ink-100">
            <h3 className="font-serif text-sm text-brand-900">Notificações</h3>
            {countNaoLidas > 0 && (
              <button
                onClick={handleMarcarTodas}
                className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                title="Marcar todas como lidas"
              >
                <Check size={14} />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recentes.length === 0 ? (
              <div className="px-4 py-6 text-center text-ink-400">
                <Bell size={24} className="mx-auto mb-2 text-ink-300" />
                <p className="text-xs">Nenhuma notificação.</p>
              </div>
            ) : (
              recentes.map((n) => {
                const Icone = ICONE_TIPO[n.tipo];
                return (
                  <button
                    key={n.id}
                    onClick={() => abrirNotificacao(n)}
                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                      !n.lida ? 'bg-brand-50' : 'hover:bg-ink-25'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${COR_TIPO[n.tipo]}`}>
                      <Icone size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.lida ? 'text-brand-900' : 'text-ink-600'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-ink-500 line-clamp-2">{n.mensagem}</p>
                      <p className="text-[10px] text-ink-400 mt-0.5">
                        {new Date(n.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.lida && (
                      <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {recentes.length > 0 && recentes.length >= 10 && (
            <div className="pt-1 border-t border-ink-100">
              <button
                onClick={() => {
                  setAberto(false);
                  navigate(prefixo === '/portal' ? `${prefixo}/mensagens` : `${prefixo}/notificacoes`);
                }}
                className="w-full px-4 py-2 text-xs text-center text-ink-600 hover:text-brand-900 hover:bg-brand-50 transition-colors"
              >
                Ver todas as notificações
              </button>
            </div>
          )}

          <div className="pt-2 pb-1 mt-1 border-t border-ink-100 px-4">
            {pushAtivo ? (
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-xs text-ink-600">
                  <Volume2 size={14} className="text-success-600" />
                  Alertas push ativos
                </span>
                <button
                  onClick={handleDesativarPush}
                  disabled={ativandoPush}
                  className="text-xs text-ink-500 hover:text-danger-600 font-medium disabled:opacity-50"
                >
                  Desativar
                </button>
              </div>
            ) : (
              <button
                onClick={handleAtivarPush}
                disabled={ativandoPush}
                className="w-full flex items-center justify-center gap-2 text-xs bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-60 rounded-lg px-3 py-2 font-medium transition-colors"
              >
                <Volume2 size={14} />
                {ativandoPush ? 'Ativando...' : 'Ativar alertas mesmo com o app fechado'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}