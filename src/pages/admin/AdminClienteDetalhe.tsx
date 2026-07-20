import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, User, Mail, Phone, MapPin, FileText, Scale, Calendar,
  MessageSquare, Plus, Pencil, AlertCircle, Clock, CheckCircle2, X,
  Send, Trash2,
} from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type {
  Cliente, Processo, Compromisso, Mensagem, StatusProcesso, TipoCompromisso,
} from '../../types/database';
import {
  STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR, TIPO_COMPROMISSO_LABEL,
} from '../../types/database';
import { formatarData, formatarDataHora, formatarTelefone, tempoRelativo } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

type Aba = 'dados' | 'processos' | 'agenda' | 'mensagens';

const AREAS = [
  'Direito de Família', 'Direito Civil', 'Direito do Trabalho',
  'Direito Previdenciário', 'Direito Empresarial', 'Direito Penal', 'Outro',
];

interface CompromissoComProcesso extends Compromisso {
  processo?: Processo | null;
}
interface MensagemComProcesso extends Mensagem {
  processo?: Processo | null;
}

export default function AdminClienteDetalhe() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoComProcesso[]>([]);
  const [mensagens, setMensagens] = useState<MensagemComProcesso[]>([]);
  const [aba, setAba] = useState<Aba>('dados');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Edição de dados
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cpf: '', endereco: '', observacoes: '',
  });

  // Novo processo
  const [modalProc, setModalProc] = useState(false);
  const [formProc, setFormProc] = useState({
    numero: '', titulo: '', area_direito: AREAS[0], status: 'em_andamento' as StatusProcesso, descricao: '',
  });

  // Novo compromisso
  const [modalComp, setModalComp] = useState(false);
  const [formComp, setFormComp] = useState({
    titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' as TipoCompromisso, processo_id: '',
  });

  // Responder mensagem
  const [resposta, setResposta] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    carregar();
  }, [id]);

  const carregar = async () => {
    setLoading(true);
    const c = await db.getCliente(id);
    if (!c) { setLoading(false); return; }
    setCliente(c);
    setForm({
      nome: c.nome, email: c.email, telefone: c.telefone || '',
      cpf: c.cpf || '', endereco: c.endereco || '', observacoes: c.observacoes || '',
    });
    const [procs, comps, msgs] = await Promise.all([
      db.listProcessosByCliente(id),
      db.listCompromissosByCliente(id),
      db.listMensagensByCliente(id),
    ]);
    setProcessos(procs);
    setCompromissos(comps);
    setMensagens(msgs);
    setLoading(false);
  };

  const salvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;
    setSalvando(true);
    try {
      await db.updateCliente(cliente.id, {
        nome: form.nome, email: form.email,
        telefone: form.telefone || null, cpf: form.cpf || null,
        endereco: form.endereco || null, observacoes: form.observacoes || null,
      });
      toast.sucesso('Dados do cliente atualizados!');
      setEditando(false);
      carregar();
    } catch {
      toast.erro('Erro ao salvar.');
    }
    setSalvando(false);
  };

  const criarProcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSalvando(true);
    try {
      await db.createProcesso({
        numero: formProc.numero, titulo: formProc.titulo,
        area_direito: formProc.area_direito, status: formProc.status,
        cliente_id: id, descricao: formProc.descricao || null, advogado_id: null,
      });
      toast.sucesso('Processo criado!');
      setModalProc(false);
      setFormProc({ numero: '', titulo: '', area_direito: AREAS[0], status: 'em_andamento', descricao: '' });
      carregar();
    } catch {
      toast.erro('Erro ao criar processo.');
    }
    setSalvando(false);
  };

  const criarCompromisso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComp.data_hora) return;
    setSalvando(true);
    try {
      await db.createCompromisso({
        titulo: formComp.titulo, descricao: formComp.descricao || null,
        data_hora: new Date(formComp.data_hora).toISOString(),
        tipo: formComp.tipo, processo_id: formComp.processo_id || null,
        lembrete_enviado: false,
      });
      toast.sucesso('Compromisso agendado!');
      setModalComp(false);
      setFormComp({ titulo: '', descricao: '', data_hora: '', tipo: 'audiencia', processo_id: '' });
      carregar();
    } catch {
      toast.erro('Erro ao agendar.');
    }
    setSalvando(false);
  };

  const excluirCompromisso = async (c: Compromisso) => {
    if (!confirm('Excluir este compromisso?')) return;
    await db.deleteCompromisso(c.id);
    toast.sucesso('Compromisso excluído.');
    carregar();
  };

  const responderMensagem = async (processoId: string) => {
    const texto = resposta[processoId]?.trim();
    if (!texto || !user) return;
    try {
      await db.createMensagem({
        processo_id: processoId, remetente_id: user.uid,
        conteudo: texto, canal: 'portal', lida: false,
      });
      setResposta({ ...resposta, [processoId]: '' });
      carregar();
    } catch {
      toast.erro('Erro ao enviar.');
    }
  };

  if (loading) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>;
  }

  if (!cliente) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="text-ink-300 mx-auto mb-3" />
        <p className="text-ink-500">Cliente não encontrado.</p>
        <Link to="/admin/clientes" className="btn-secondary mt-4">Voltar</Link>
      </div>
    );
  }

  const abas: { id: Aba; label: string; icon: typeof User; badge?: number }[] = [
    { id: 'dados', label: 'Dados', icon: User },
    { id: 'processos', label: 'Processos', icon: Scale, badge: processos.length },
    { id: 'agenda', label: 'Agenda', icon: Calendar, badge: compromissos.length },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: mensagens.filter((m) => !m.lida).length },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <Link to="/admin/clientes" className="inline-flex items-center gap-1 text-ink-500 hover:text-brand-800 text-sm mb-6">
        <ChevronLeft size={18} /> Voltar aos clientes
      </Link>

      {/* Cabeçalho do cliente */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-brand-800 flex items-center justify-center shrink-0">
            <User size={26} className="text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-brand-900">{cliente.nome}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-ink-600">
              <span className="flex items-center gap-1.5"><Mail size={14} className="text-ink-400" />{cliente.email}</span>
              {cliente.telefone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-ink-400" />{formatarTelefone(cliente.telefone)}</span>}
              {cliente.cpf && <span className="text-ink-500">CPF: {cliente.cpf}</span>}
            </div>
            {cliente.endereco && (
              <p className="flex items-center gap-1.5 text-sm text-ink-500 mt-1"><MapPin size={14} className="text-ink-400" />{cliente.endereco}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cliente.user_id ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <CheckCircle2 size={12} /> Com acesso ao portal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 bg-ink-50 border border-ink-200 rounded-full px-2.5 py-1">
                <X size={12} /> Sem acesso
              </span>
            )}
          </div>
        </div>
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
            <a.icon size={16} />
            {a.label}
            {a.badge !== undefined && a.badge > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                a.id === 'mensagens' ? 'bg-danger-500 text-white' : 'bg-ink-100 text-ink-600'
              }`}>{a.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Dados */}
      {aba === 'dados' && (
        <div className="animate-fade-in">
          {editando ? (
            <form onSubmit={salvarDados} className="card p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo *</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Telefone</label>
                  <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input-field" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">CPF</label>
                  <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="input-field" placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Endereço</label>
                <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="input-field min-h-[80px] resize-y" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditando(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </form>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-brand-900">Dados cadastrais</h3>
                <button onClick={() => setEditando(true)} className="btn-ghost text-sm">
                  <Pencil size={14} /> Editar
                </button>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div><dt className="text-xs text-ink-400 uppercase tracking-wide">Nome</dt><dd className="text-sm text-ink-800 mt-0.5">{cliente.nome}</dd></div>
                <div><dt className="text-xs text-ink-400 uppercase tracking-wide">E-mail</dt><dd className="text-sm text-ink-800 mt-0.5">{cliente.email}</dd></div>
                <div><dt className="text-xs text-ink-400 uppercase tracking-wide">Telefone</dt><dd className="text-sm text-ink-800 mt-0.5">{cliente.telefone ? formatarTelefone(cliente.telefone) : '—'}</dd></div>
                <div><dt className="text-xs text-ink-400 uppercase tracking-wide">CPF</dt><dd className="text-sm text-ink-800 mt-0.5">{cliente.cpf || '—'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-ink-400 uppercase tracking-wide">Endereço</dt><dd className="text-sm text-ink-800 mt-0.5">{cliente.endereco || '—'}</dd></div>
                {cliente.observacoes && (
                  <div className="sm:col-span-2"><dt className="text-xs text-ink-400 uppercase tracking-wide">Observações</dt><dd className="text-sm text-ink-800 mt-0.5 whitespace-pre-wrap">{cliente.observacoes}</dd></div>
                )}
                <div><dt className="text-xs text-ink-400 uppercase tracking-wide">Cadastrado em</dt><dd className="text-sm text-ink-800 mt-0.5">{formatarData(cliente.criado_em)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      )}

      {/* Processos */}
      {aba === 'processos' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-4">
            <button onClick={() => setModalProc(true)} className="btn-primary text-sm">
              <Plus size={16} /> Novo processo
            </button>
          </div>
          {processos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhum processo vinculado a este cliente.</div>
          ) : (
            <div className="space-y-3">
              {processos.map((p) => (
                <Link key={p.id} to={`/admin/processos/${p.id}`} className="card p-5 hover:shadow-md hover:border-brand-200 transition-all group flex items-center justify-between">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-lg bg-brand-100 group-hover:bg-brand-800 transition-colors flex items-center justify-center shrink-0">
                      <Scale size={20} className="text-brand-700 group-hover:text-gold-400 transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg text-brand-900 truncate">{p.titulo}</h3>
                        <span className={`badge ${STATUS_PROCESSO_COR[p.status]}`}>{STATUS_PROCESSO_LABEL[p.status]}</span>
                      </div>
                      <p className="text-sm text-ink-500 mt-0.5">{p.numero} · {p.area_direito}</p>
                      <p className="text-xs text-ink-400 mt-1">Atualizado em {formatarData(p.atualizado_em)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agenda */}
      {aba === 'agenda' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-4">
            <button onClick={() => setModalComp(true)} className="btn-primary text-sm">
              <Plus size={16} /> Novo compromisso
            </button>
          </div>
          {compromissos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhum compromisso para este cliente.</div>
          ) : (
            <div className="space-y-3">
              {compromissos
                .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                .map((c) => (
                  <div key={c.id} className="card p-4 flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <Calendar size={20} className="text-brand-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brand-900 text-sm">{c.titulo}</p>
                        <span className="badge bg-brand-100 text-brand-700 border-brand-200">{TIPO_COMPROMISSO_LABEL[c.tipo]}</span>
                      </div>
                      <p className="text-xs text-ink-400 mt-1">{formatarDataHora(c.data_hora)}</p>
                      {c.processo && <p className="text-[10px] text-ink-400 truncate mt-0.5">{c.processo.titulo} · {c.processo.numero}</p>}
                      {c.descricao && <p className="text-xs text-ink-500 mt-1">{c.descricao}</p>}
                    </div>
                    <button onClick={() => excluirCompromisso(c)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-danger-600 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Mensagens */}
      {aba === 'mensagens' && (
        <div className="animate-fade-in space-y-6">
          {mensagens.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">Nenhuma mensagem trocada com este cliente.</div>
          ) : (
            (() => {
              const porProcesso = new Map<string, MensagemComProcesso[]>();
              mensagens.forEach((m) => {
                const arr = porProcesso.get(m.processo_id) || [];
                arr.push(m);
                porProcesso.set(m.processo_id, arr);
              });
              return Array.from(porProcesso.entries()).map(([pid, msgs]) => {
                const proc = msgs[0].processo;
                return (
                  <div key={pid} className="card overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-ink-100 bg-brand-50/50">
                      <Link to={`/admin/processos/${pid}`} className="hover:text-brand-700">
                        <p className="text-sm font-medium text-brand-900">{proc?.titulo}</p>
                        <p className="text-xs text-ink-400">{proc?.numero}</p>
                      </Link>
                    </div>
                    <div className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                      {[...msgs].reverse().map((m) => {
                        const minha = m.remetente_id === user?.uid;
                        return (
                          <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${minha ? 'bg-brand-800 text-brand-50' : 'bg-brand-50 text-ink-800'}`}>
                              <p className="text-sm whitespace-pre-wrap">{m.conteudo}</p>
                              <p className={`text-[10px] mt-1 ${minha ? 'text-brand-300' : 'text-ink-400'}`}>{tempoRelativo(m.criado_em)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-ink-100 p-3 flex gap-2">
                      <input
                        value={resposta[pid] || ''}
                        onChange={(e) => setResposta({ ...resposta, [pid]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') responderMensagem(pid); }}
                        placeholder="Responder…"
                        className="input-field"
                      />
                      <button onClick={() => responderMensagem(pid)} disabled={!resposta[pid]?.trim()} className="btn-primary px-4">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* Modal novo processo */}
      <Modal aberto={modalProc} onFechar={() => setModalProc(false)} titulo="Novo processo">
        <form onSubmit={criarProcesso} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Número do processo *</label>
              <input required value={formProc.numero} onChange={(e) => setFormProc({ ...formProc, numero: e.target.value })} className="input-field" placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Área do Direito *</label>
              <select value={formProc.area_direito} onChange={(e) => setFormProc({ ...formProc, area_direito: e.target.value })} className="input-field">
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input required value={formProc.titulo} onChange={(e) => setFormProc({ ...formProc, titulo: e.target.value })} className="input-field" placeholder="Ex.: Ação de divórcio consensual" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status inicial</label>
            <select value={formProc.status} onChange={(e) => setFormProc({ ...formProc, status: e.target.value as StatusProcesso })} className="input-field">
              {Object.entries(STATUS_PROCESSO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição</label>
            <textarea value={formProc.descricao} onChange={(e) => setFormProc({ ...formProc, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalProc(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando…' : 'Criar processo'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal novo compromisso */}
      <Modal aberto={modalComp} onFechar={() => setModalComp(false)} titulo="Novo compromisso">
        <form onSubmit={criarCompromisso} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input required value={formComp.titulo} onChange={(e) => setFormComp({ ...formComp, titulo: e.target.value })} className="input-field" placeholder="Ex.: Audiência de conciliação" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Data e hora *</label>
              <input required type="datetime-local" value={formComp.data_hora} onChange={(e) => setFormComp({ ...formComp, data_hora: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Tipo</label>
              <select value={formComp.tipo} onChange={(e) => setFormComp({ ...formComp, tipo: e.target.value as TipoCompromisso })} className="input-field">
                {Object.entries(TIPO_COMPROMISSO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Vincular a processo (opcional)</label>
            <select value={formComp.processo_id} onChange={(e) => setFormComp({ ...formComp, processo_id: e.target.value })} className="input-field">
              <option value="">Sem vínculo</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.titulo} ({p.numero})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição</label>
            <textarea value={formComp.descricao} onChange={(e) => setFormComp({ ...formComp, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalComp(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando…' : 'Agendar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
