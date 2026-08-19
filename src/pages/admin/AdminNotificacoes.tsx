import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Calendar, MessageSquare, Clock, Filter } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Notificacao, TipoNotificacao } from '../../types/database';
import { tempoRelativo } from '../../lib/utils';
import { toast } from '../../components/Toast';

const ICONE_TIPO: Record<TipoNotificacao, React.ElementType> = {
  compromisso: Calendar,
  mensagem: MessageSquare,
  lembrete: Clock,
};

const LABEL_TIPO: Record<TipoNotificacao, string> = {
  compromisso: 'Compromisso',
  mensagem: 'Mensagem',
  lembrete: 'Lembrete',
};

const COR_TIPO: Record<TipoNotificacao, string> = {
  compromisso: 'bg-brand-100 text-brand-700 border-brand-200',
  mensagem: 'bg-blue-100 text-blue-700 border-blue-200',
  lembrete: 'bg-warning-100 text-warning-700 border-warning-200',
};

type FiltroLeitura = 'todas' | 'nao_lidas' | 'lidas';

export default function AdminNotificacoes() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacao | 'todos'>('todos');
  const [filtroLeitura, setFiltroLeitura] = useState<FiltroLeitura>('nao_lidas');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const lista = await db.listNotificoes(user.uid);
      setNotificacoes(lista);
    } catch {
      toast.erro('Erro ao carregar notificações.');
    }
    setLoading(false);
  };

  const marcarComoLida = async (n: Notificacao) => {
    await db.marcarNotificaoLida(n.id);
    setNotificacoes((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)),
    );
  };

  const marcarTodasLidas = async () => {
    if (!user) return;
    await db.marcarNotificoesLidasTodas(user.uid);
    setNotificacoes((prev) => prev.map((x) => ({ ...x, lida: true })));
    toast.sucesso('Todas as notificações marcadas como lidas.');
  };

  const excluir = async (n: Notificacao) => {
    await db.deleteNotificacao(n.id);
    setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
  };

  const filtradas = notificacoes.filter((n) => {
    const tipoOk = filtroTipo === 'todos' || n.tipo === filtroTipo;
    const leituraOk =
      filtroLeitura === 'todas' ||
      (filtroLeitura === 'nao_lidas' && !n.lida) ||
      (filtroLeitura === 'lidas' && n.lida);
    return tipoOk && leituraOk;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
    }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-brand-900">Notificações</h1>
          <p className="text-ink-500 mt-1">Alertas de agendamentos e mensagens em segundo plano.</p>
        </div>
        {notificacoes.some((n) => !n.lida) && (
          <button
            onClick={marcarTodasLidas}
            className="btn-secondary text-xs"
            title="Marcar todas como lidas"
          >
            <Check size={14} />
            Marcar todas lidas
          </button>
        )}
      </div>

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-ink-400" />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoNotificacao | 'todos')}
          className="input-field py-1 text-sm w-40"
        >
          <option value="todos">Todos os tipos</option>
          <option value="compromisso">{LABEL_TIPO.compromisso}</option>
          <option value="mensagem">{LABEL_TIPO.mensagem}</option>
          <option value="lembrete">{LABEL_TIPO.lembrete}</option>
        </select>
        <select
          value={filtroLeitura}
          onChange={(e) => setFiltroLeitura(e.target.value as FiltroLeitura)}
          className="input-field py-1 text-sm w-40"
        >
          <option value="nao_lidas">Não lidas</option>
          <option value="lidas">Lidas</option>
          <option value="todas">Todas</option>
        </select>
        <span className="text-xs text-ink-400 ml-auto">
          {filtradas.length} de {notificacoes.length}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">
            {filtroLeitura === 'nao_lidas'
              ? 'Nenhuma notificação não lida.'
              : 'Nenhuma notificação encontrada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((n) => {
            const Icone = ICONE_TIPO[n.tipo];
            return (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-4 ${
                  !n.lida ? 'border-l-4 border-gold-500' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${COR_TIPO[n.tipo]}`}>
                  <Icone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium ${!n.lida ? 'text-brand-900' : 'text-ink-600'}`}>{n.titulo}</p>
                    {!n.lida && <span className="w-2 h-2 rounded-full bg-gold-500" />}
                    <span className={`badge ${COR_TIPO[n.tipo]} text-xs`}>{LABEL_TIPO[n.tipo]}</span>
                  </div>
                  <p className="text-sm text-ink-600 mb-1">{n.mensagem}</p>
                  <p className="text-xs text-ink-400">{tempoRelativo(n.criado_em)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.lida && (
                    <button onClick={() => marcarComoLida(n)} className="p-1 text-ink-400 hover:text-brand-700" title="Marcar como lida">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => excluir(n)} className="p-1 text-ink-400 hover:text-danger-600" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}