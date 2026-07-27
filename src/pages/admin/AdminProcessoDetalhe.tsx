import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Scale, FileText, Upload, Download, Send, Clock,
  MessageSquare, Plus, Trash2, AlertCircle, User, Calendar,
} from 'lucide-react';
import * as db from '../../lib/db';
import { uploadDocumento, caminhoDocumentoUpload, deleteDocumentoArquivo } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';
import type {
  Processo, Movimentacao, Documento, Mensagem, Cliente, Compromisso,
} from '../../types/database';
import {
  STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR,
  TIPO_DOCUMENTO_LABEL, TIPO_COMPROMISSO_LABEL,
  type StatusProcesso, type TipoDocumento, type TipoCompromisso,
} from '../../types/database';
import { formatarDataHora, formatarData, tempoRelativo } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

type Aba = 'timeline' | 'documentos' | 'mensagens' | 'compromissos';

export default function AdminProcessoDetalhe() {
  const { id } = useParams() as { id: string };
  const { user, perfil } = useAuth();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [aba, setAba] = useState<Aba>('timeline');
  const [loading, setLoading] = useState(true);
  const [novaMov, setNovaMov] = useState({ status: '', descricao: '' });
  const [modalMov, setModalMov] = useState(false);
  const [novaMsg, setNovaMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [modalComp, setModalComp] = useState(false);
  const [novoComp, setNovoComp] = useState({
    titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' as TipoCompromisso,
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const podeGerenciar = perfil?.papel === 'admin' || perfil?.papel === 'advogado';

  useEffect(() => {
    if (!id) return;
    carregar();
  }, [id]);

  const carregar = async () => {
    setLoading(true);
    const proc = await db.getProcessoComCliente(id);
    if (proc) {
      setProcesso(proc);
      setCliente(proc.cliente);
    }
    const [movs, docs, msgs, comps] = await Promise.all([
      db.listMovimentacoes(id),
      db.listDocumentos(id),
      db.listMensagens(id),
      db.listCompromissosByProcesso(id),
    ]);
    setMovimentacoes(movs);
    setDocumentos(docs);
    setMensagens(msgs);
    setCompromissos(comps);
    setLoading(false);
  };

  const alterarStatus = async (novoStatus: StatusProcesso) => {
    if (!processo) return;
    try {
      await db.updateStatusProcesso(processo.id, novoStatus);
    } catch {
      toast.erro('Erro ao alterar status.');
      return;
    }
    toast.sucesso('Status atualizado!');
    carregar();
  };

  const adicionarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await db.createMovimentacao({
        processo_id: id,
        status: novaMov.status || STATUS_PROCESSO_LABEL[processo?.status || 'em_andamento'],
        descricao: novaMov.descricao,
      });
    } catch {
      toast.erro('Erro ao adicionar movimentação.');
      return;
    }
    toast.sucesso('Movimentação adicionada!');
    setModalMov(false);
    setNovaMov({ status: '', descricao: '' });
    carregar();
  };

  const excluirMovimentacao = async (m: Movimentacao) => {
    if (!confirm('Excluir esta movimentação?')) return;
    await db.deleteMovimentacao(m.id);
    carregar();
  };

  const enviarMensagem = async () => {
    if (!novaMsg.trim() || !user || !id) return;
    try {
      await db.createMensagem({
        processo_id: id,
        remetente_id: user.uid,
        conteudo: novaMsg.trim(),
        canal: 'portal',
        lida: false,
      });
    } catch {
      toast.erro('Erro ao enviar.');
      return;
    }
    setNovaMsg('');
    carregar();
  };

  const marcarComoLida = async (m: Mensagem) => {
    await db.marcarMensagemLida(m.id);
    carregar();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.erro('Arquivo muito grande (máx. 10MB).');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const caminho = caminhoDocumentoUpload('admin', id, ext || 'bin');
    let publicUrl: string;
    try {
      publicUrl = await uploadDocumento(caminho, file);
    } catch {
      setUploading(false);
      toast.erro('Erro ao enviar.');
      return;
    }
    try {
      await db.createDocumento({
        processo_id: id,
        nome: file.name,
        url: publicUrl,
        tipo: 'outro',
        enviado_por_id: user.uid,
      });
    } catch {
      setUploading(false);
      toast.erro('Erro ao registrar documento.');
      return;
    }
    setUploading(false);
    toast.sucesso('Documento enviado!');
    carregar();
  };

  const excluirDocumento = async (d: Documento) => {
    if (!confirm(`Excluir "${d.nome_arquivo}"?`)) return;
    await Promise.all([db.deleteDocumento(d.id), deleteDocumentoArquivo(d.url)]);
    carregar();
  };

  const baixarDocumento = (d: Documento) => {
    window.open(d.url, '_blank');
  };

  const adicionarCompromisso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !novoComp.data_hora) return;
    try {
      await db.createCompromisso({
        processo_id: id,
        titulo: novoComp.titulo,
        descricao: novoComp.descricao || null,
        data_hora: new Date(novoComp.data_hora).toISOString(),
        tipo: novoComp.tipo,
        lembrete_enviado: false,
      });
    } catch {
      toast.erro('Erro ao agendar.');
      return;
    }
    toast.sucesso('Compromisso agendado!');
    setModalComp(false);
    setNovoComp({ titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' });
    carregar();
  };

  if (loading) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>;
  }

  if (!processo) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="text-ink-300 mx-auto mb-3" />
        <p className="text-ink-500">Processo não encontrado.</p>
        <Link to="/admin/processos" className="btn-secondary mt-4">Voltar</Link>
      </div>
    );
  }

  const abas: { id: Aba; label: string; badge?: number }[] = [
    { id: 'timeline', label: 'Linha do tempo', badge: movimentacoes.length },
    { id: 'documentos', label: 'Documentos', badge: documentos.length },
    { id: 'mensagens', label: 'Mensagens', badge: mensagens.filter((m) => !m.lida).length },
    { id: 'compromissos', label: 'Compromissos', badge: compromissos.length },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <Link to="/admin/processos" className="inline-flex items-center gap-1 text-ink-500 hover:text-brand-800 text-sm mb-6">
        <ChevronLeft size={18} /> Voltar aos processos
      </Link>

      {/* Cabeçalho */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-brand-800 flex items-center justify-center shrink-0">
            <Scale size={26} className="text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-brand-900">{processo.titulo}</h1>
            <p className="text-sm text-ink-500 mt-1">
              Processo nº {processo.numero} · {processo.area_direito}
            </p>
            {cliente && (
              <div className="flex items-center gap-1.5 text-sm text-ink-600 mt-2">
                <User size={14} className="text-ink-400" />
                Cliente: <span className="font-medium text-brand-900">{cliente.nome}</span>
              </div>
            )}
            {processo.descricao && (
              <p className="text-sm text-ink-600 mt-3 leading-relaxed">{processo.descricao}</p>
            )}
          </div>
        </div>

        {/* Alterar status */}
        {podeGerenciar && (
          <div className="mt-5 pt-5 border-t border-ink-100">
            <p className="text-xs text-ink-500 mb-2">Status do processo</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_PROCESSO_LABEL) as [StatusProcesso, string][]).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => alterarStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    processo.status === status
                      ? STATUS_PROCESSO_COR[status]
                      : 'bg-white text-ink-500 border-ink-200 hover:border-ink-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-ink-100 overflow-x-auto">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              aba === a.id ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {a.label}
            {a.badge !== undefined && a.badge > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                a.id === 'mensagens' ? 'bg-danger-500 text-white' : 'bg-ink-100 text-ink-600'
              }`}>{a.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {aba === 'timeline' && (
        <div className="animate-fade-in">
          {podeGerenciar && (
            <div className="mb-4 flex justify-end">
              <button onClick={() => setModalMov(true)} className="btn-primary text-sm">
                <Plus size={16} /> Adicionar movimentação
              </button>
            </div>
          )}
          {movimentacoes.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhuma movimentação registrada.</div>
          ) : (
            <div className="space-y-4">
              {movimentacoes.map((m, idx) => (
                <div key={m.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-gold-500' : 'bg-ink-300'}`} />
                    {idx < movimentacoes.length - 1 && <div className="w-0.5 flex-1 bg-ink-200" />}
                  </div>
                  <div className="card p-4 flex-1 mb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-medium text-brand-900 text-sm">{m.status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-400">{formatarDataHora(m.criado_em)}</span>
                        {podeGerenciar && (
                          <button
                            onClick={() => excluirMovimentacao(m)}
                            className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-danger-600 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-ink-600 mt-1">{m.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documentos */}
      {aba === 'documentos' && (
        <div className="animate-fade-in">
          {podeGerenciar && (
            <div className="mb-4 flex justify-end">
              <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInput.current?.click()} disabled={uploading} className="btn-primary text-sm">
                {uploading ? 'Enviando…' : (<><Upload size={16} /> Enviar documento</>)}
              </button>
            </div>
          )}
          {documentos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhum documento.</div>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div key={d.id} className="card p-4 flex items-center justify-between hover:border-brand-200 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-brand-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">{d.nome_arquivo}</p>
                      <p className="text-xs text-ink-400">{TIPO_DOCUMENTO_LABEL[d.tipo]} · {formatarData(d.criado_em)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => baixarDocumento(d)} className="btn-ghost text-sm">
                      <Download size={16} />
                    </button>
                    {podeGerenciar && (
                      <button onClick={() => excluirDocumento(d)} className="btn-ghost text-sm text-danger-600 hover:bg-danger-50">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensagens */}
      {aba === 'mensagens' && (
        <div className="animate-fade-in flex flex-col h-[60vh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin bg-brand-50 rounded-lg p-4">
            {mensagens.length === 0 ? (
              <p className="text-center text-ink-500 text-sm py-8">Nenhuma mensagem.</p>
            ) : (
              mensagens.map((m) => {
                const minha = m.remetente_id === user?.uid;
                return (
                  <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div
                      onClick={() => !m.lida && !minha && marcarComoLida(m)}
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 cursor-${
                        !m.lida && !minha ? 'pointer' : 'default'
                      } ${minha ? 'bg-brand-800 text-brand-50' : m.lida ? 'bg-white border border-ink-100 text-ink-800' : 'bg-white border-2 border-gold-300 text-ink-800'}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{m.conteudo}</p>
                      <p className={`text-[10px] mt-1 ${minha ? 'text-brand-300' : 'text-ink-400'}`}>
                        {tempoRelativo(m.criado_em)}{!m.lida && !minha && ' · clique para marcar como lida'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={novaMsg}
              onChange={(e) => setNovaMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder="Responder ao cliente…"
              className="input-field"
            />
            <button onClick={enviarMensagem} disabled={!novaMsg.trim()} className="btn-primary px-4">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Compromissos */}
      {aba === 'compromissos' && (
        <div className="animate-fade-in">
          {podeGerenciar && (
            <div className="mb-4 flex justify-end">
              <button onClick={() => setModalComp(true)} className="btn-primary text-sm">
                <Plus size={16} /> Agendar compromisso
              </button>
            </div>
          )}
          {compromissos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhum compromisso agendado.</div>
          ) : (
            <div className="space-y-3">
              {compromissos
                .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                .map((c) => (
                  <div key={c.id} className="card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <Calendar size={20} className="text-brand-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brand-900 text-sm">{c.titulo}</p>
                        <span className="badge bg-brand-100 text-brand-700 border-brand-200">
                          {TIPO_COMPROMISSO_LABEL[c.tipo]}
                        </span>
                      </div>
                      <p className="text-xs text-ink-400 mt-1">{formatarDataHora(c.data_hora)}</p>
                      {c.descricao && <p className="text-xs text-ink-500 mt-1">{c.descricao}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Modal movimentação */}
      <Modal aberto={modalMov} onFechar={() => setModalMov(false)} titulo="Adicionar movimentação" tamanho="sm">
        <form onSubmit={adicionarMovimentacao} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status / título da movimentação *</label>
            <input
              required
              value={novaMov.status}
              onChange={(e) => setNovaMov({ ...novaMov, status: e.target.value })}
              className="input-field"
              placeholder="Ex.: Petição protocolada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição *</label>
            <textarea
              required
              value={novaMov.descricao}
              onChange={(e) => setNovaMov({ ...novaMov, descricao: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Descreva a movimentação…"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalMov(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </Modal>

      {/* Modal compromisso */}
      <Modal aberto={modalComp} onFechar={() => setModalComp(false)} titulo="Agendar compromisso" tamanho="sm">
        <form onSubmit={adicionarCompromisso} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input required value={novoComp.titulo} onChange={(e) => setNovoComp({ ...novoComp, titulo: e.target.value })} className="input-field" placeholder="Ex.: Audiência de conciliação" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Data e hora *</label>
              <input required type="datetime-local" value={novoComp.data_hora} onChange={(e) => setNovoComp({ ...novoComp, data_hora: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Tipo</label>
              <select value={novoComp.tipo} onChange={(e) => setNovoComp({ ...novoComp, tipo: e.target.value as TipoCompromisso })} className="input-field">
                {Object.entries(TIPO_COMPROMISSO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição</label>
            <textarea value={novoComp.descricao} onChange={(e) => setNovoComp({ ...novoComp, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalComp(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Agendar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
