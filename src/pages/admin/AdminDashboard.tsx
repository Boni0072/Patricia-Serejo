import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Users, MessageSquare, Calendar, TrendingUp,
  Scale, Clock, ArrowRight, AlertCircle,
} from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';
import type { Processo, Mensagem, Compromisso } from '../../types/database';
import { STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR } from '../../types/database';
import { formatarDataHora, tempoRelativo } from '../../lib/utils';

interface Dados {
  totalProcessos: number;
  processosAtivos: number;
  totalClientes: number;
  mensagensNaoLidas: number;
  proximosCompromissos: Compromisso[];
  porStatus: Record<string, number>;
  porArea: Record<string, number>;
  recentes: Processo[];
  msgsRecentes: Mensagem[];
}

export default function AdminDashboard() {
  const { user, perfil } = useAuth();
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const papel = perfil?.papel ?? 'admin';
      const uid = user?.uid ?? '';

      const [processos, clientes, msgs, compromissos] = await Promise.all([
        db.listProcessosVisiveis(papel, uid),
        db.listClientesVisiveis(papel, uid),
        db.listMensagensNaoLidasVisiveis(papel, uid, 5),
        db.listProximosCompromissosVisiveis(papel, uid, 5),
      ]);

      const porStatus: Record<string, number> = {};
      const porArea: Record<string, number> = {};
      processos.forEach((p) => {
        porStatus[p.status] = (porStatus[p.status] || 0) + 1;
        porArea[p.area_direito] = (porArea[p.area_direito] || 0) + 1;
      });

      const recentes = [...processos]
        .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
        .slice(0, 5);

      setDados({
        totalProcessos: processos.length,
        processosAtivos: processos.filter((p) => p.status === 'em_andamento').length,
        totalClientes: clientes.length,
        mensagensNaoLidas: msgs.length,
        proximosCompromissos: compromissos,
        porStatus,
        porArea,
        recentes,
        msgsRecentes: msgs,
      });
      setLoading(false);
    } catch {
      setLoading(false);
      toast.erro('Erro ao carregar o dashboard. Verifique sua permissão de acesso.');
    }
  };

  if (loading || !dados) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const ehAdvogado = perfil?.papel === 'advogado';

  const cards = [
    {
      label: 'Processos Ativos',
      valor: dados.processosAtivos,
      total: dados.totalProcessos,
      icon: FolderOpen,
      cor: 'from-blue-500 to-blue-600',
      link: '/admin/processos',
    },
    {
      label: ehAdvogado ? 'Meus Clientes' : 'Clientes',
      valor: dados.totalClientes,
      icon: Users,
      cor: 'from-emerald-500 to-emerald-600',
      link: ehAdvogado ? '/admin/processos' : '/admin/clientes',
    },
    {
      label: 'Mensagens não lidas',
      valor: dados.mensagensNaoLidas,
      icon: MessageSquare,
      cor: 'from-gold-500 to-gold-600',
      link: '/admin/mensagens',
    },
    {
      label: 'Próximos compromissos',
      valor: dados.proximosCompromissos.length,
      icon: Calendar,
      cor: 'from-brand-600 to-brand-700',
      link: '/admin/agenda',
    },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Dashboard</h1>
        <p className="text-ink-500 mt-1">
          Bem-vindo(a), {perfil?.nome.split(' ')[0]}. Visão geral do escritório.
        </p>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.link}
            className="card p-5 hover:shadow-md hover:border-brand-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${c.cor} flex items-center justify-center text-white shadow-sm`}>
                <c.icon size={20} />
              </div>
              <ArrowRight size={16} className="text-ink-300 group-hover:text-brand-700 transition-colors" />
            </div>
            <p className="text-3xl font-serif text-brand-900">{c.valor}</p>
            <p className="text-sm text-ink-500 mt-1">{c.label}</p>
            {c.total !== undefined && (
              <p className="text-xs text-ink-400 mt-1">de {c.total} no total</p>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos por status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-brand-900">Processos por Status</h3>
            <TrendingUp size={18} className="text-ink-400" />
          </div>
          <div className="space-y-3">
            {Object.entries(STATUS_PROCESSO_LABEL).map(([status, label]) => {
              const count = dados.porStatus[status] || 0;
              const pct = dados.totalProcessos > 0 ? (count / dados.totalProcessos) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink-700">{label}</span>
                    <span className="font-medium text-brand-900">{count}</span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-700 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Processos por área */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-brand-900">Por Área do Direito</h3>
            <Scale size={18} className="text-ink-400" />
          </div>
          {Object.keys(dados.porArea).length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">Nenhum dado ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(dados.porArea)
                .sort((a, b) => b[1] - a[1])
                .map(([area, count]) => (
                  <div key={area} className="flex items-center justify-between py-1.5 border-b border-ink-50 last:border-0">
                    <span className="text-sm text-ink-700">{area}</span>
                    <span className="badge bg-brand-100 text-brand-700 border-brand-200">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Processos recentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-brand-900">Atualizações Recentes</h3>
            <Link to="/admin/processos" className="text-xs text-brand-700 hover:text-brand-900">
              Ver todos
            </Link>
          </div>
          {dados.recentes.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">Nenhum processo cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {dados.recentes.map((p) => (
                <Link
                  key={p.id}
                  to={`/admin/processos/${p.id}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-900 truncate">{p.titulo}</p>
                    <p className="text-xs text-ink-400">{p.numero} · {tempoRelativo(p.atualizado_em)}</p>
                  </div>
                  <span className={`badge ${STATUS_PROCESSO_COR[p.status]} shrink-0 ml-2`}>
                    {STATUS_PROCESSO_LABEL[p.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Próximos compromissos */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-brand-900">Próximos Compromissos</h3>
            <Link to="/admin/agenda" className="text-xs text-brand-700 hover:text-brand-900">
              Ver agenda
            </Link>
          </div>
          {dados.proximosCompromissos.length === 0 ? (
            <div className="text-center py-6">
              <Clock size={28} className="text-ink-300 mx-auto mb-2" />
              <p className="text-sm text-ink-400">Nenhum compromisso agendado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dados.proximosCompromissos.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold-500 mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-900">{c.titulo}</p>
                    <p className="text-xs text-ink-400">{formatarDataHora(c.data_hora)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
