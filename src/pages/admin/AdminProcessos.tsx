import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Search, ChevronRight, Scale, Filter, ExternalLink } from 'lucide-react';
import * as db from '../../lib/db';
import type { Processo, Cliente } from '../../types/database';
import { STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR, type StatusProcesso } from '../../types/database';
import * as storage from '../../lib/storage';
import { formatarData } from '../../lib/utils';
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
  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const [procs, clients] = await Promise.all([
      db.listProcessosComClientes(),
      db.listClientes(),
    ]);
    setProcessos(procs);
    setClientes(clients.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoading(false);
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
        advogado_id: null,
      });

      // Upload de arquivos, se houver
      if (arquivos && arquivos.length > 0) {
        toast.info(`Enviando ${arquivos.length} arquivo(s)…`);
        for (const arquivo of Array.from(arquivos)) {
          const extensao = arquivo.name.split('.').pop() || 'bin';
          const caminho = storage.caminhoDocumentoUpload('admin', processoId, extensao);
          const url = await storage.uploadDocumento(caminho, arquivo);
          await db.createDocumento({
            processo_id: processoId,
            nome: arquivo.name,
            url,
            tipo: 'outro',
            enviado_por: 'advogado',
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

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto">
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
            return (
            <button
              key={p.id}
              onClick={() => setProcessoSelecionado(p)}
              className="card p-5 hover:shadow-md hover:border-brand-200 transition-all group flex items-center justify-between w-full text-left"
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
                  <p className="text-xs text-ink-400 mt-1">Atualizado em {formatarData(p.atualizado_em)}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-ink-300 group-hover:text-brand-700 shrink-0 ml-4" />
            </button>
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
            <button onClick={() => navigate(`/admin/processos/${processoSelecionado.id}`)} className="btn-primary w-full justify-center mt-2"><ExternalLink size={16} /> Editar / Ver detalhes</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
