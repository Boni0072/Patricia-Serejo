import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, Mail, Phone, MoreVertical, Pencil, Trash2, X, AlertCircle,
  KeyRound, CheckCircle2, MailOpen, ChevronRight, Send,
} from 'lucide-react';
import * as db from '../../lib/db';
import { uploadDocumento } from '../../lib/storage';
import { criarContaCliente, reenviarAcessoCliente, codErroAuth } from '../../lib/authAdmin';
import { useAuth } from '../../context/AuthContext';
import type { Cliente, Processo } from '../../types/database';
import { formatarData, formatarTelefone } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

interface ClienteComProcessos extends Cliente {
  processos?: Processo[];
}

type ModoModal = 'fechado' | 'novo' | 'editar' | 'acesso' | 'convite';

export default function AdminClientes() {
  const { user, perfil } = useAuth();
  const [clientes, setClientes] = useState<ClienteComProcessos[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<ModoModal>('fechado');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cpf: '', endereco: '', observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<File | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [convite, setConvite] = useState({ nome: '', email: '' });
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; abrirParaCima: boolean } | null>(null);

  const podeGerenciar = perfil?.papel === 'admin' || perfil?.papel === 'advogado';

  useEffect(() => {
    carregar();
  }, []);

  // Fecha o menu de ações ao rolar ou redimensionar (evita que o menu fixo fique "descolado" do botão)
  useEffect(() => {
    if (!menuId) return;
    const fechar = () => fecharMenu();
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuId]);

  const carregar = async () => {
    try {
      const papel = perfil?.papel ?? 'admin';
      const uid = user?.uid ?? '';
      const data = await db.listClientesComProcessosVisiveis(papel, uid);
      setClientes(data);
      setLoading(false);
    } catch {
      setLoading(false);
      toast.erro('Erro ao carregar os clientes. Verifique sua permissão de acesso.');
    }
  };

  const filtrados = clientes.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.cpf || '').includes(busca)
    );
  });

  const fecharMenu = () => {
    setMenuId(null);
    setMenuPos(null);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', email: '', telefone: '', cpf: '', endereco: '', observacoes: '' });
    setFotoBase64(null);
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
    fecharMenu();
  };

  const abrirAcesso = (c: Cliente) => {
    setEditando(c);
    setModo('acesso');
    fecharMenu();
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
      // Advogado cria o cliente vinculado a ele; admin cria sem vínculo.
      ...(perfil?.papel === 'advogado' ? { advogado_id: user?.uid ?? null } : {}),
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
      // Cria o cliente sem foto (a foto é adicionada em uma segunda etapa,
      // respeitando o limite de ~1MB por campo do Firestore).
      const clienteId = await db.createCliente({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null,
        ...(perfil?.papel === 'advogado' ? { advogado_id: user?.uid ?? null } : {}),
      } as Cliente);

      // Upload da foto (Storage para arquivos grandes, data-URL para pequenos).
      if (fotoBase64) {
        const fotoUrl = await uploadDocumento(`clientes/${clienteId}`, fotoBase64);
        await db.updateCliente(clienteId, { foto_url: fotoUrl });
      }

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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFotoBase64(null);
      return;
    }
    if (file.size > 700 * 1024) { // 700KB
      toast.erro('Imagem muito grande (máx. 700KB).');
      return;
    }
    setFotoBase64(file);
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
    fecharMenu();
    if (!confirm(`Reenviar e-mail de definição de senha para ${c.email}?`)) return;
    try {
      await reenviarAcessoCliente(c.email);
      toast.sucesso('E-mail reenviado para ' + c.email);
    } catch {
      toast.erro('Erro ao reenviar e-mail.');
    }
  };

  // Monta e abre o cliente de e-mail padrão com uma mensagem pronta convidando
  // o destinatário a se cadastrar no portal do cliente.
  const montarEEnviarConvite = (email: string, nome: string) => {
    // Quando o remetente é um advogado, inclui o uid dele no link para que o
    // cliente que se cadastrar por ele seja vinculado automaticamente a ele.
    // O nome vai apenas para EXIBIÇÃO na tela de cadastro (campo não editável);
    // o vínculo em si é feito só pelo uid (advogado_id). Nenhum e-mail/senha do
    // advogado é trafegado. O admin não vincula automaticamente.
    const params = perfil?.papel === 'advogado' && user?.uid
      ? `?advogado=${encodeURIComponent(user.uid)}${perfil?.nome ? `&advogado_nome=${encodeURIComponent(perfil.nome)}` : ''}`
      : '';
    const linkCadastro = `${window.location.origin}/cadastro${params}`;
    const assunto = 'Convite para acessar o Portal do Cliente';
    const saudacao = nome.trim() ? `Olá, ${nome.trim()}!` : 'Olá!';
    const corpo =
      `${saudacao}\n\n` +
      `Você foi convidado(a) a criar seu acesso ao Portal do Cliente do ` +
      `Patricia Cristiane Serejo Advocacia. Por lá é possível acompanhar seus ` +
      `processos, enviar documentos e conversar com o escritório com segurança.\n\n` +
      `Para se cadastrar, acesse o link abaixo e crie sua senha:\n${linkCadastro}\n\n` +
      `Atenciosamente,\nPatricia Cristiane Serejo Advocacia`;
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

    // Usa um elemento <a> temporário para acionar o cliente de e-mail padrão.
    const a = document.createElement('a');
    a.href = mailto;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.sucesso('Mensagem pronta aberta no seu aplicativo de e-mail para ' + email);
  };

  // Ação do menu de contexto (⋯) de uma linha: envia para o cliente da linha.
  const enviarConviteCadastro = (c: Cliente) => {
    fecharMenu();
    montarEEnviarConvite(c.email, c.nome);
  };

  // Ação do botão do topo: abre o modal para informar o destinatário.
  const abrirConvite = () => {
    setConvite({ nome: '', email: '' });
    setModo('convite');
  };

  const enviarConviteDoModal = (e: React.FormEvent) => {
    e.preventDefault();
    const email = convite.email.trim();
    if (!email) {
      toast.erro('Informe o e-mail do destinatário.');
      return;
    }
    setEnviandoConvite(true);
    montarEEnviarConvite(email, convite.nome);
    setEnviandoConvite(false);
    setModo('fechado');
  };



  // Botão dentro de "Dados cadastrais": envia ao cliente a solicitação para criar/redefinir a senha.
  // - Sem conta de acesso: cria a conta e envia o e-mail de definição de senha.
  // - Com conta de acesso: reenvia o e-mail de definição de senha.
  const solicitarCriacaoSenha = async () => {
    if (!editando) return;
    if (form.email.trim().toLowerCase() !== editando.email.trim().toLowerCase()) {
      toast.erro('O e-mail foi alterado. Salve os dados antes de enviar a solicitação.');
      return;
    }
    if (!confirm(`Enviar solicitação de criação de senha para ${editando.email}?`)) return;

    setEnviandoSenha(true);
    try {
      if (editando.user_id) {
        await reenviarAcessoCliente(editando.email);
        toast.sucesso('Solicitação enviada para ' + editando.email);
      } else {
        const uid = await criarContaCliente({
          nome: editando.nome,
          email: editando.email,
          telefone: editando.telefone || '',
          cpf: editando.cpf || '',
        });
        await db.updateCliente(editando.id, { user_id: uid });
        setEditando({ ...editando, user_id: uid });
        toast.sucesso('Solicitação enviada para ' + editando.email);
        carregar();
      }
    } catch (err) {
      const cod = codErroAuth(err);
      if (cod === 'email-em-uso') {
        toast.erro('Este e-mail já possui conta de acesso. Tente reenviar a solicitação.');
      } else if (cod === 'email-invalido') {
        toast.erro('E-mail inválido.');
      } else if (cod === 'operacao-bloqueada') {
        toast.erro('Cadastro por e-mail/senha não habilitado no Firebase.');
      } else {
        toast.erro('Erro ao enviar a solicitação de senha.');
      }
    }
    setEnviandoSenha(false);
  };

  const excluir = async (c: Cliente) => {
    fecharMenu();
    if (!confirm(`Excluir o cliente "${c.nome}"? Esta ação removerá também os processos vinculados.`)) return;
    try {
      await db.deleteCliente(c.id);
      toast.sucesso('Cliente excluído.');
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
    <div className="p-6 sm:p-8 lg:p-10 w-full">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand-900">Clientes</h1>
          <p className="text-ink-500 mt-1">Gestão de clientes e acessos ao portal.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={abrirConvite} className="btn-secondary">
            <Mail size={18} /> Enviar convite
          </button>
          <button onClick={abrirNovo} className="btn-primary">
            <Plus size={18} /> Novo cliente
          </button>
        </div>
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
                  <td className="px-4 py-3 flex items-center gap-3">
                    <img
                      src={c.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.nome)}&background=e0f2fe&color=0c4a6e&size=96`}
                      alt={`Foto de ${c.nome}`}
                      className="w-9 h-9 rounded-full object-cover bg-brand-100"
                    />
                    <div>
                      <Link to={`/admin/clientes/${c.id}`} className="font-medium text-brand-900 text-sm hover:text-brand-700 hover:underline">
                        {c.nome}
                      </Link>
                      {c.cpf && <p className="text-xs text-ink-400">{c.cpf}</p>}
                    </div>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        if (menuId === c.id) {
                          fecharMenu();
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const MENU_ALTURA = 216;
                        const abrirParaCima = window.innerHeight - rect.bottom < MENU_ALTURA && rect.top > MENU_ALTURA;
                        setMenuPos({
                          top: abrirParaCima ? rect.top - MENU_ALTURA - 6 : rect.bottom + 6,
                          left: rect.right - 192,
                          abrirParaCima,
                        });
                        setMenuId(c.id);
                      }}
                      className={`p-1.5 rounded-lg text-ink-500 transition-colors ${menuId === c.id ? 'bg-brand-100 text-brand-700' : 'hover:bg-ink-100'}`}
                      aria-haspopup="menu"
                      aria-expanded={menuId === c.id}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Menu de ações do cliente — renderizado via portal para não ser cortado pelo card */}
      {menuId && menuPos && (() => {
        const c = filtrados.find((x) => x.id === menuId);
        if (!c) return null;
        return createPortal(
          <>
            <div className="fixed inset-0 z-[95]" onClick={fecharMenu} onContextMenu={(e) => { e.preventDefault(); fecharMenu(); }} />
            <div
              role="menu"
              className="fixed z-[100] w-48 bg-white rounded-xl shadow-xl border border-ink-100 py-1.5 animate-scale-in"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <Link
                to={`/admin/clientes/${c.id}`}
                onClick={fecharMenu}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-brand-50 transition-colors"
              >
                <ChevronRight size={15} className="text-ink-400" /> Ver detalhes
              </Link>
              <button
                onClick={() => abrirEditar(c)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-brand-50 transition-colors"
              >
                <Pencil size={15} className="text-ink-400" /> Editar dados
              </button>
              {!c.user_id && (
                <button
                  onClick={() => abrirAcesso(c)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-brand-50 transition-colors"
                >
                  <KeyRound size={15} className="text-ink-400" /> Criar acesso
                </button>
              )}
              {c.user_id && (
                <button
                  onClick={() => reenviarAcesso(c)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-brand-50 transition-colors"
                >
                  <MailOpen size={15} className="text-ink-400" /> Reenviar acesso
                </button>
              )}
              <button
                onClick={() => enviarConviteCadastro(c)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-brand-50 transition-colors"
              >
                <Mail size={15} className="text-ink-400" /> Enviar link de cadastro
              </button>
              {perfil?.papel === 'admin' && (
                <>
                  <div className="my-1 h-px bg-ink-100" />
                  <button
                    onClick={() => excluir(c)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                </>
              )}
            </div>
          </>,
          document.body,
        );
      })()}

      {/* Modal Novo cliente — com envio automático de e-mail */}
      <Modal aberto={modo === 'novo'} onFechar={fecharModal} titulo="Novo cliente">
        <form onSubmit={salvarClienteComAcesso} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Foto do perfil (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
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

      {/* Modal Editar — Dados cadastrais do cliente */}
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

          {/* Solicitação de criação de senha */}
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
            <KeyRound size={20} className="text-brand-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-900">Senha de acesso ao sistema</p>
              <p className="text-xs text-ink-600 mt-1">
                {editando?.user_id
                  ? 'Este cliente já possui acesso. Você pode reenviar o e-mail para que ele defina uma nova senha.'
                  : 'Este cliente ainda não possui acesso. Envie uma solicitação para que ele crie sua senha e acesse o portal.'}
              </p>
              <button
                type="button"
                onClick={solicitarCriacaoSenha}
                disabled={enviandoSenha || salvando}
                className="btn-secondary mt-3 inline-flex items-center gap-2"
              >
                <Send size={14} />
                {enviandoSenha
                  ? 'Enviando…'
                  : editando?.user_id
                    ? 'Reenviar solicitação de senha'
                    : 'Enviar solicitação para criar senha'}
              </button>
            </div>
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

      {/* Modal Enviar convite de cadastro — monta e-mail com link para /cadastro */}
      <Modal aberto={modo === 'convite'} onFechar={fecharModal} titulo="Enviar convite de cadastro">
        <form onSubmit={enviarConviteDoModal} className="space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
            <Mail size={20} className="text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-ink-700">
                Vamos abrir seu aplicativo de e-mail com uma mensagem pronta convidando o
                destinatário a criar o acesso ao Portal do Cliente. Você revisa e envia.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome do destinatário</label>
            <input
              list="convite-clientes"
              value={convite.nome}
              onChange={(e) => setConvite((v) => ({ ...v, nome: e.target.value }))}
              className="input-field"
              placeholder="Ex.: Maria Silva"
            />
            <datalist id="convite-clientes">
              {clientes.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail do destinatário *</label>
            <input
              type="email"
              required
              list="convite-emails"
              value={convite.email}
              onChange={(e) => setConvite((v) => ({ ...v, email: e.target.value }))}
              className="input-field"
              placeholder="cliente@email.com"
            />
            <datalist id="convite-emails">
              {clientes.map((c) => (
                <option key={c.id} value={c.email} />
              ))}
            </datalist>
            <p className="text-xs text-ink-400 mt-1">
              Dica: você pode digitar ou escolher um cliente já cadastrado na lista.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={enviandoConvite} className="btn-primary">
              {enviandoConvite ? 'Preparando…' : 'Preparar e-mail de convite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}