import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, Mail, Phone, MoreVertical, Pencil, Trash2, X, AlertCircle,
  KeyRound, CheckCircle2, MailOpen, ChevronRight,
} from 'lucide-react';
import * as db from '../../lib/db';
import { criarContaCliente, reenviarAcessoCliente, codErroAuth } from '../../lib/authAdmin';
import { useAuth } from '../../context/AuthContext';
import type { Cliente, Processo } from '../../types/database';
import { formatarData, formatarTelefone } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

interface ClienteComProcessos extends Cliente {
  processos?: Processo[];
}

type ModoModal = 'fechado' | 'novo' | 'editar' | 'acesso';

export default function AdminClientes() {
  const { perfil } = useAuth();
  const [clientes, setClientes] = useState<ClienteComProcessos[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<ModoModal>('fechado');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cpf: '', endereco: '', observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const podeGerenciar = perfil?.papel === 'admin' || perfil?.papel === 'advogado';

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const data = await db.listClientesComProcessos();
    setClientes(data);
    setLoading(false);
  };

  const filtrados = clientes.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.cpf || '').includes(busca)
    );
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', email: '', telefone: '', cpf: '', endereco: '', observacoes: '' });
    setModo('novo');
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setForm({
      nome: c.nome,
      email: c.email,
      telefone: c.telefone || '',
      cpf: c.cpf || '',
      endereco: c.endereco || '',
      observacoes: c.observacoes || '',
    });
    setModo('editar');
    setMenuId(null);
  };

  const abrirAcesso = (c: Cliente) => {
    setEditando(c);
    setModo('acesso');
    setMenuId(null);
  };

  const fecharModal = () => {
    setModo('fechado');
    setEditando(null);
  };

  const salvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone || null,
      cpf: form.cpf || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
    };
    try {
      if (editando) {
        await db.updateCliente(editando.id, payload);
        toast.sucesso('Cliente atualizado!');
      } else {
        await db.createCliente(payload);
        toast.sucesso('Cliente cadastrado!');
      }
      setModo('fechado');
      carregar();
    } catch {
      toast.erro('Erro ao salvar cliente.');
    }
    setSalvando(false);
  };

  const salvarClienteComAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const clienteId = await db.createCliente({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null,
      });
      let uid: string | null = null;
      try {
        uid = await criarContaCliente({
          nome: form.nome,
          email: form.email,
          telefone: form.telefone || '',
          cpf: form.cpf || '',
        });
        await db.updateCliente(clienteId, { user_id: uid });
        toast.sucesso('Cliente cadastrado! E-mail de acesso enviado para ' + form.email);
      } catch (err) {
        const cod = codErroAuth(err);
        if (cod === 'email-em-uso') {
          toast.erro('Cliente salvo, mas o e-mail já tem conta de acesso. Use "Reenviar acesso".');
        } else if (cod === 'operacao-bloqueada') {
          toast.erro('Cadastro por e-mail/senha não habilitado no Firebase.');
        } else {
          toast.erro('Cliente salvo, mas falha ao enviar e-mail de acesso.');
        }
      }
      setModo('fechado');
      carregar();
    } catch {
      toast.erro('Erro ao cadastrar cliente.');
    }
    setSalvando(false);
  };

  const criarAcessoExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      const uid = await criarContaCliente({
        nome: editando.nome,
        email: editando.email,
        telefone: editando.telefone || '',
        cpf: editando.cpf || '',
      });
      await db.updateCliente(editando.id, { user_id: uid });
      toast.sucesso('Acesso criado! E-mail enviado para ' + editando.email);
      setModo('fechado');
      carregar();
    } catch (err) {
      const cod = codErroAuth(err);
      if (cod === 'email-em-uso') {
        toast.erro('Este e-mail já tem conta. Use "Reenviar acesso".');
      } else if (cod === 'email-invalido') {
        toast.erro('E-mail inválido.');
      } else if (cod === 'operacao-bloqueada') {
        toast.erro('Cadastro por e-mail/senha não habilitado no Firebase.');
      } else {
        toast.erro('Erro ao criar acesso.');
      }
    }
    setSalvando(false);
  };

  const reenviarAcesso = async (c: Cliente) => {
    setMenuId(null);
    if (!confirm(`Reenviar e-mail de definição de senha para ${c.email}?`)) return;
    try {
      await reenviarAcessoCliente(c.email);
      toast.sucesso('E-mail reenviado para ' + c.email);
    } catch {
      toast.erro('Erro ao reenviar e-mail.');
    }
  };

  const excluir = async (c: Cliente) => {
    if (!confirm(`Excluir o cliente "${c.nome}"? Esta ação removerá também os processos vinculados.`)) return;
    try {
      await db.deleteCliente(c.id);
      toast.sucesso('Cliente excluído.');
      setMenuId(null);
      carregar();
    } catch {
      toast.erro('Erro ao excluir cliente.');
    }
  };

  if (!podeGerenciar) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="text-ink-300 mx-auto mb-3" />
        <p className="text-ink-500">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand-900">Clientes</h1>
          <p className="text-ink-500 mt-1">Gestão de clientes e acessos ao portal.</p>
        </div>
        <button onClick={abrirNovo} className="btn-primary">
          <Plus size={18} /> Novo cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou CPF…"
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-brand-50/50">
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Contato</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Processos</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Acesso</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-ink-50 hover:bg-brand-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/clientes/${c.id}`} className="font-medium text-brand-900 text-sm hover:text-brand-700 hover:underline">
                      {c.nome}
                    </Link>
                    {c.cpf && <p className="text-xs text-ink-400">{c.cpf}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-ink-700 flex items-center gap-1.5">
                      <Mail size={12} className="text-ink-400" />
                      {c.email}
                    </p>
                    {c.telefone && (
                      <p className="text-xs text-ink-400 flex items-center gap-1.5 mt-0.5">
                        <Phone size={12} />
                        {formatarTelefone(c.telefone)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="badge bg-brand-100 text-brand-700 border-brand-200">
                      {c.processos?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.user_id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                        <CheckCircle2 size={12} /> Com acesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 bg-ink-50 border border-ink-200 rounded-full px-2.5 py-1">
                        <X size={12} /> Sem acesso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-ink-500">
                    {formatarData(c.criado_em)}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                      className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuId === c.id && (
                      <div className="absolute right-4 top-10 z-10 bg-white rounded-lg shadow-lg border border-ink-100 py-1 w-48 animate-scale-in">
                        <Link
                          to={`/admin/clientes/${c.id}`}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
                        >
                          <ChevronRight size={14} /> Ver detalhes
                        </Link>
                        <button
                          onClick={() => abrirEditar(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
                        >
                          <Pencil size={14} /> Editar dados
                        </button>
                        {!c.user_id && (
                          <button
                            onClick={() => abrirAcesso(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
                          >
                            <KeyRound size={14} /> Criar acesso
                          </button>
                        )}
                        {c.user_id && (
                          <button
                            onClick={() => reenviarAcesso(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
                          >
                            <MailOpen size={14} /> Reenviar acesso
                          </button>
                        )}
                        <button
                          onClick={() => excluir(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo cliente — com envio automático de e-mail */}
      <Modal aberto={modo === 'novo'} onFechar={fecharModal} titulo="Novo cliente">
        <form onSubmit={salvarClienteComAcesso} className="space-y-4">
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

          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
            <MailOpen size={20} className="text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-brand-900">Acesso automático ao portal</p>
              <p className="text-xs text-ink-600 mt-1">
                Ao cadastrar, o cliente receberá um e-mail em <strong>{form.email || '—'}</strong> com
                um link para definir sua própria senha e acessar a área do cliente.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Cadastrando…' : 'Cadastrar e enviar acesso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal aberto={modo === 'editar'} onFechar={fecharModal} titulo="Editar cliente">
        <form onSubmit={salvarCliente} className="space-y-4">
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
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar Acesso — cliente existente sem conta */}
      <Modal aberto={modo === 'acesso'} onFechar={fecharModal} titulo={`Criar acesso — ${editando?.nome ?? ''}`}>
        <form onSubmit={criarAcessoExistente} className="space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
            <MailOpen size={20} className="text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-ink-700">
                Será criada uma conta de acesso para <strong>{editando?.email}</strong>.
                O cliente receberá um e-mail com um link para definir sua própria senha
                e passar a acompanhar seus processos, mensagens e agenda no portal.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Enviando…' : 'Criar acesso e enviar e-mail'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
