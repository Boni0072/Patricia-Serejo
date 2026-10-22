import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, ChevronRight, Scale, Filter, ExternalLink,
  CalendarPlus, CalendarClock, Gavel, Users, Clock as ClockIcon, Calendar,
} from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Processo, Cliente, Compromisso } from '../../types/database';
import {
  STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR, TIPO_COMPROMISSO_LABEL,
  type StatusProcesso, type TipoCompromisso,
} from '../../types/database';
import * as storage from '../../lib/storage';
import { formatarData, formatarDataHora } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

interface ProcessoComCliente extends Processo {
  cliente?: Cliente | null;
}

const AREAS = [
  'Direito de Família',
  'Direito Civil',
  'Direito do Trabalho',
  'Direito Previdenciário',
  'Direito Empresarial',
  'Direito Penal',
  'Outro',
];

/** Ícone e cor de cada tipo de compromisso (mesmo mapeamento do AdminAgenda). */
const ICONE_COMPROMISSO: Record<TipoCompromisso, typeof Gavel> = {
  audiencia: Gavel,
  reuniao: Users,
  prazo: ClockIcon,
  outro: Calendar,
};

const COR_COMPROMISSO: Record<TipoCompromisso, string> = {
  audiencia: 'bg-danger-100 text-danger-700 border-danger-200',
  reuniao: 'bg-blue-100 text-blue-700 border-blue-200',
  prazo: 'bg-warning-100 text-warning-700 border-warning-200',
  outro: 'bg-ink-100 text-ink-700 border-ink-200',
};

export default function AdminProcessos() {
  const [processos, setProcessos] = useState<ProcessoComCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoComCliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({
    numero: '', titulo: '', area_direito: AREAS[0], status: 'em_andamento' as StatusProcesso,
    cliente_id: '', descricao: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  /** Compromissos futuros agrupados por processo (id do processo -> lista ordenada). */
  const [compromissosPorProcesso, setCompromissosPorProcesso] = useState<Map<string, Compromisso[]>>(new Map());
  /** Processo alvo do modal de agendamento (null = modal fechado). */
  const [processoAgendamento, setProcessoAgendamento] = useState<ProcessoComCliente | null>(null);
  const [modalComp, setModalComp] = useState(false);
  const [salvandoComp, setSalvandoComp] = useState(false);
  const [novoComp, setNovoComp] = useState({
    titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' as TipoCompromisso,
  });
  const navigate = useNavigate();
  const { user, perfil } = useAuth();

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const papel = perfil?.papel ?? 'admin';
      const uid = user?.uid ?? '';
      const [procs, clients] = await Promise.all([
        db.listProcessosComClientesVisiveis(papel, uid),
        db.listClientesVisiveis(papel, uid),
      ]);
      setProcessos(procs);
      setClientes(clients.sort((a, b) => a.nome.localeCompare(b.nome)));
      // Carrega os agendamentos futuros em uma única consulta para exibir
      // o próximo compromisso de cada processo no card da listagem.
      const mapa = await db.listProximosCompromissosPorProcessos(procs.map((p) => p.id));
      setCompromissosPorProcesso(mapa);
      setLoading(false);
    } catch {
      setLoading(false);
      toast.erro('Erro ao carregar os processos. Verifique sua permissão de acesso.');
    }
  };

  const filtrados = processos.filter((p) => {
    const q = busca.toLowerCase();
    const matchBusca = p.titulo.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q) || p.area_direito.toLowerCase().includes(q);
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const abrirNovo = () => {
    setForm({
      numero: '', titulo: '', area_direito: AREAS[0], status: 'em_andamento',
      cliente_id: clientes[0]?.id || '', descricao: '',
    });
    setArquivos(null);
    setModalAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id) {
      toast.erro('Selecione um cliente.');
      return;
    }
    setSalvando(true);
    try {
      const processoId = await db.createProcesso({
        numero: form.numero,
        titulo: form.titulo,
        area_direito: form.area_direito,
        status: form.status,
        cliente_id: form.cliente_id,
        descricao: form.descricao || null,
        advogado_id: perfil?.papel === 'advogado' ? user?.uid ?? null : null,
      });

      // Upload de arquivos, se houver (híbrido: base64 p/ pequenos, Storage p/ grandes)
      if (arquivos && arquivos.length > 0) {
        toast.info(`Enviando ${arquivos.length} arquivo(s)…`);
        for (const arquivo of Array.from(arquivos)) {
          const extensao = arquivo.name.split('.').pop() || 'bin';
          const caminho = storage.caminhoDocumentoUpload('admin', processoId, extensao);
          const url = await storage.uploadDocumento(caminho, arquivo);
          await db.createDocumento({
            processo_id: processoId,
            nome_arquivo: arquivo.name,
            url,
            tipo: 'outro',
            enviado_por_id: user?.uid ?? null,
          });
        }
      }
    } catch {
      setSalvando(false);
      toast.erro('Erro ao cadastrar processo.');
      return;
    }
    setSalvando(false);
    toast.sucesso('Processo cadastrado!');
    setModalAberto(false);
    carregar();
  };

  const fecharModalDetalhe = () => {
    setProcessoSelecionado(null);
  };

  /* ---------- Agendamento de compromisso ---------- */

  const abrirAgendamento = (p: ProcessoComCliente) => {
    setProcessoAgendamento(p);
    setNovoComp({ titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' });
    setModalComp(true);
  };

  const salvarCompromisso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processoAgendamento) return;
    if (!novoComp.titulo.trim()) {
      toast.erro('Informe o título do compromisso.');
      return;
    }
    if (!novoComp.data_hora) {
      toast.erro('Informe a data e a hora.');
      return;
    }
    const data = new Date(novoComp.data_hora);
    if (Number.isNaN(data.getTime())) {
      toast.erro('Data e hora inválidas.');
      return;
    }
    setSalvandoComp(true);
    try {
      await db.createCompromisso({
        processo_id: processoAgendamento.id,
        titulo: novoComp.titulo.trim(),
        descricao: novoComp.descricao.trim() || null,
        data_hora: data.toISOString(),
        tipo: novoComp.tipo,
        lembrete_enviado: false,
      });
    } catch {
      setSalvandoComp(false);
      toast.erro('Erro ao agendar o compromisso.');
      return;
    }
    setSalvandoComp(false);
    toast.sucesso('Compromisso agendado!');
    setModalComp(false);
    setProcessoAgendamento(null);
    // Recarrega para atualizar o próximo compromisso exibido no card.
    carregar();
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 w-full">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand-900">Processos</h1>
          <p className="text-ink-500 mt-1">Gestão de processos jurídicos.</p>
        </div>
        <button onClick={abrirNovo} className="btn-primary" disabled={clientes.length === 0}>
          <Plus size={18} /> Novo processo
        </button>
      </div>

      {clientes.length === 0 && (
        <div className="card p-4 mb-6 bg-warning-50 border-warning-100 text-warning-700 text-sm flex items-center gap-2">
          Cadastre um cliente antes de criar processos.{' '}
          <Link to="/admin/clientes" className="underline font-medium hover:opacity-80">
            Ir para Clientes
          </Link>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, número ou área…"
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field pl-10 pr-8 appearance-none"
          >
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS_PROCESSO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhum processo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const cor = STATUS_PROCESSO_COR[p.status] || 'bg-ink-100 text-ink-600 border-ink-200';
            const comps = compromissosPorProcesso.get(p.id) ?? [];
            const proximo = comps[0];
            const IconeProximo = proximo ? ICONE_COMPROMISSO[proximo.tipo] : CalendarClock;
            const abrirDetalhe = () => setProcessoSelecionado(p);
            return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={abrirDetalhe}
              onKeyDown={(e) => {
                // Ignora eventos vindos de botões internos (evita abrir o
                // detalhe junto com a ação do botão aninhado).
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirDetalhe();
                }
              }}
              className="card p-5 hover:shadow-md hover:border-brand-200 transition-all group flex items-center justify-between w-full text-left cursor-pointer"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-lg bg-brand-100 group-hover:bg-brand-800 transition-colors flex items-center justify-center shrink-0">
                  <Scale size={20} className="text-brand-700 group-hover:text-gold-400 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-lg text-brand-900 truncate">{p.titulo}</h3>
                    <span className={`badge ${cor}`}>{STATUS_PROCESSO_LABEL[p.status]}</span>
                  </div>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {p.numero} · {p.area_direito}
                  </p>
                  {p.cliente && (
                    <p className="text-xs text-ink-400 mt-1">Cliente: {p.cliente.nome}</p>
                  )}

                  {/* Próximo agendamento do processo */}
                  {proximo ? (
                    <div className="mt-2 flex items-start gap-2 flex-wrap">
                      <span className={`badge ${COR_COMPROMISSO[proximo.tipo]} gap-1`}>
                        <IconeProximo size={12} />
                        {TIPO_COMPROMISSO_LABEL[proximo.tipo]}
                      </span>
                      <span className="text-xs text-ink-600 font-medium truncate max-w-full">
                        {proximo.titulo}
                      </span>
                      <span className="text-xs text-ink-400">· {formatarDataHora(proximo.data_hora)}</span>
                      {comps.length > 1 && (
                        <span className="text-xs text-ink-400">(+{comps.length - 1} mais)</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-400 mt-2 flex items-center gap-1.5">
                      <CalendarClock size={13} className="text-ink-300" />
                      Sem agendamentos
                    </p>
                  )}

                  <p className="text-xs text-ink-400 mt-1">Atualizado em {formatarData(p.atualizado_em)}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirAgendamento(p);
                  }}
                  title="Agendar compromisso para este processo"
                  className="btn-secondary px-3 py-2 text-xs gap-1.5"
                >
                  <CalendarPlus size={14} />
                  Agendar
                </button>
                <ChevronRight size={20} className="text-ink-300 group-hover:text-brand-700" />
              </div>
            </div>
          )})}
        </div>
      )}

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo processo">
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Cliente *</label>
            <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="input-field">
              <option value="">Selecione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Número do processo *</label>
              <input required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="input-field" placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Área do Direito *</label>
              <select value={form.area_direito} onChange={(e) => setForm({ ...form, area_direito: e.target.value })} className="input-field">
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título / descrição curta *</label>
            <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input-field" placeholder="Ex.: Ação de divórcio consensual" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status inicial</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusProcesso })} className="input-field">
              {Object.entries(STATUS_PROCESSO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição detalhada</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Anexar documentos (opcional)</label>
            <input
              type="file"
              multiple
              onChange={(e) => setArquivos(e.target.files)}
              className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Salvando…' : 'Cadastrar processo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalhes do Processo */}
      {processoSelecionado && (
        <Modal aberto={!!processoSelecionado} onFechar={fecharModalDetalhe} titulo="Detalhes do Processo">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide">Título</p>
              <p className="text-lg font-serif text-brand-900">{processoSelecionado.titulo}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Nº do Processo</p>
                <p className="text-sm text-ink-700">{processoSelecionado.numero}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Área</p>
                <p className="text-sm text-ink-700">{processoSelecionado.area_direito}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide">Cliente</p>
              <p className="text-sm text-ink-700">{processoSelecionado.cliente?.nome || 'Não informado'}</p>
            </div>
            {processoSelecionado.descricao && (
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Descrição</p>
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{processoSelecionado.descricao}</p>
              </div>
            )}

            {/* Próximos agendamentos */}
            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">
                Próximos agendamentos
              </p>
              {(compromissosPorProcesso.get(processoSelecionado.id) ?? []).length === 0 ? (
                <p className="text-sm text-ink-500">Nenhum compromisso agendado.</p>
              ) : (
                <div className="space-y-2">
                  {(compromissosPorProcesso.get(processoSelecionado.id) ?? []).map((c) => {
                    const Icone = ICONE_COMPROMISSO[c.tipo];
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-ink-100 bg-ink-50/50">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${COR_COMPROMISSO[c.tipo]}`}>
                          <Icone size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-brand-900 truncate">{c.titulo}</p>
                            <span className={`badge ${COR_COMPROMISSO[c.tipo]}`}>
                              {TIPO_COMPROMISSO_LABEL[c.tipo]}
                            </span>
                          </div>
                          <p className="text-xs text-ink-500 mt-0.5">{formatarDataHora(c.data_hora)}</p>
                          {c.descricao && (
                            <p className="text-xs text-ink-500 mt-0.5">{c.descricao}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => {
                  const alvo = processoSelecionado;
                  fecharModalDetalhe();
                  abrirAgendamento(alvo);
                }}
                className="btn-secondary w-full justify-center mt-3"
              >
                <CalendarPlus size={16} /> Agendar compromisso
              </button>
            </div>

            <button onClick={() => navigate(`/admin/processos/${processoSelecionado.id}`)} className="btn-primary w-full justify-center mt-2"><ExternalLink size={16} /> Editar / Ver detalhes</button>
          </div>
        </Modal>
      )}

      {/* Modal Agendar compromisso */}
      <Modal
        aberto={modalComp}
        onFechar={() => {
          setModalComp(false);
          setProcessoAgendamento(null);
        }}
        titulo="Agendar compromisso"
      >
        <form onSubmit={salvarCompromisso} className="space-y-4">
          {processoAgendamento && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-100">
              <p className="text-xs text-ink-400 uppercase tracking-wide">Processo</p>
              <p className="text-sm font-medium text-brand-900">{processoAgendamento.titulo}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                {processoAgendamento.numero} · {processoAgendamento.area_direito}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input
              required
              value={novoComp.titulo}
              onChange={(e) => setNovoComp({ ...novoComp, titulo: e.target.value })}
              className="input-field"
              placeholder="Ex.: Audiência de instrução"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Data e hora *</label>
              <input
                required
                type="datetime-local"
                value={novoComp.data_hora}
                onChange={(e) => setNovoComp({ ...novoComp, data_hora: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Tipo</label>
              <select
                value={novoComp.tipo}
                onChange={(e) => setNovoComp({ ...novoComp, tipo: e.target.value as TipoCompromisso })}
                className="input-field"
              >
                {Object.entries(TIPO_COMPROMISSO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição</label>
            <textarea
              value={novoComp.descricao}
              onChange={(e) => setNovoComp({ ...novoComp, descricao: e.target.value })}
              className="input-field min-h-[70px] resize-y"
              placeholder="Detalhes do compromisso (opcional)"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setModalComp(false);
                setProcessoAgendamento(null);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={salvandoComp} className="btn-primary">
              {salvandoComp ? 'Agendando…' : 'Agendar compromisso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
