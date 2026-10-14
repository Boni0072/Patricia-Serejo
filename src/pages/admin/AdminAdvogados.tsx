import { useEffect, useRef, useState } from 'react';
import { Plus, Mail, Phone, MoreVertical, MailOpen, AlertCircle, Scale, UserCheck, Trash2, Pencil, Upload, X } from 'lucide-react';
import * as db from '../../lib/db';
import { criarContaAdvogado, reenviarAcessoAdvogado, codErroAuth, deleteUser } from '../../lib/authAdmin';
import { uploadDocumento } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';
import type { Perfil } from '../../types/database';
import { formatarData, formatarTelefone } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

type ModoModal = 'fechado' | 'novo' | 'editar' | 'convite';

export default function AdminAdvogados() {
  const { user, perfil } = useAuth();
  const [advogados, setAdvogados] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<ModoModal>('fechado');
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cpf: '' });
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [conviteForm, setConviteForm] = useState({ nome: '', email: '' });
  const [gerandoConvite, setGerandoConvite] = useState(false);

  const podeGerenciar = perfil?.papel === 'admin';

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const todos = await db.listPerfis();
    setAdvogados(todos.filter((p) => p.papel === 'advogado'));
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', email: '', telefone: '', cpf: '' });
    setFotoFile(null);
    setFotoPreview(null);
    setRemoverFoto(false);
    setModo('novo');
  };

  const abrirEditar = (a: Perfil) => {
    setMenuId(null);
    setEditando(a);
    setForm({ nome: a.nome, email: a.email, telefone: a.telefone ?? '', cpf: a.cpf ?? '' });
    setFotoFile(null);
    setFotoPreview(a.foto_url ?? null);
    setRemoverFoto(false);
    setModo('editar');
  };

  const fecharModal = () => {
    setModo('fechado');
    setEditando(null);
  };

  const abrirConvite = (a?: Perfil) => {
    setMenuId(null);
    setConviteForm({ nome: a?.nome ?? '', email: a?.email ?? '' });
    setModo('convite');
  };

  const enviarConviteDoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = conviteForm.nome.trim();
    const email = conviteForm.email.trim();
    if (!email) {
      toast.erro('Informe o e-mail do destinatário.');
      return;
    }
    setGerandoConvite(true);
    try {
      // Gera um token de convite vinculado a este e-mail e monta o link de
      // auto-cadastro de ADVOGADO (não de cliente).
      const token = await db.criarConviteAdvogado(email, user?.uid ?? null);
      const linkCadastro = `${window.location.origin}/cadastro-advogado?token=${token}`;
      const saudacao = nome ? `Olá, ${nome}!` : 'Olá!';
      const assunto = 'Convite para integrar a equipe como advogado(a)';
      const corpo =
        `${saudacao}\n\n` +
        `Você foi convidado para fazer parte da equipe do escritório como advogado(a).\n` +
        `Clique no link abaixo para criar sua conta de acesso à área do advogado:\n${linkCadastro}\n\n` +
        `Por segurança, o link é válido por 7 dias e só pode ser usado uma vez, pelo e-mail ${email}.\n\n` +
        `— Patricia Cristiane Serejo Advocacia`;
      window.location.href =
        `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      toast.sucesso('Abrindo seu aplicativo de e-mail com o convite pronto…');
      setModo('fechado');
    } catch (err) {
      console.error('[enviarConviteDoModal] Erro ao gerar convite:', {
        code: (err as { code?: string })?.code,
        message: (err as { message?: string })?.message,
        email,
        uid: user?.uid ?? null,
      });
      toast.erro('Erro ao gerar o convite. Tente novamente.');
    } finally {
      setGerandoConvite(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
      toast.erro('Imagem muito grande (máx. 700KB).');
      if (fotoInputRef.current) fotoInputRef.current.value = '';
      return;
    }
    setFotoFile(file);
    setRemoverFoto(false);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removerFotoSelecionada = () => {
    setFotoFile(null);
    setFotoPreview(null);
    setRemoverFoto(true);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    // Edição: atualiza nome, telefone e CPF do perfil (e-mail não muda —
    // trocar e-mail exige alterar também o usuário no Firebase Auth).
    if (modo === 'editar' && editando) {
      try {
        const dados: Parameters<typeof db.updatePerfil>[1] = {
          nome: form.nome,
          telefone: form.telefone || null,
          cpf: form.cpf || null,
        };
        // Foto: se um novo arquivo foi escolhido, converte p/ base64 e salva;
        // se o usuário pediu para remover, limpa o campo.
        if (fotoFile) {
          setUploadingFoto(true);
          try {
            dados.foto_url = await uploadDocumento(`perfis/${editando.id}`, fotoFile);
          } finally {
            setUploadingFoto(false);
          }
        } else if (removerFoto) {
          dados.foto_url = null;
        }
        await db.updatePerfil(editando.id, dados);
        toast.sucesso('Advogado atualizado!');
        setModo('fechado');
        setEditando(null);
        carregar();
      } catch {
        toast.erro('Erro ao atualizar advogado.');
      }
      setSalvando(false);
      return;
    }
    try {
      const uid = await criarContaAdvogado({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || '',
      });
      // Se uma foto foi escolhida no cadastro, salva como base64 no perfil.
      if (fotoFile && uid) {
        try {
          const url = await uploadDocumento(`perfis/${uid}`, fotoFile);
          await db.updatePerfil(uid, { foto_url: url });
        } catch {
          // Não falha o cadastro se apenas a foto der erro.
        }
      }
      toast.sucesso('Advogado cadastrado! E-mail de acesso enviado para ' + form.email);
      setModo('fechado');
      carregar();
    } catch (err) {
      const cod = codErroAuth(err);
      if (cod === 'email-em-uso') {
        toast.erro('Este e-mail já está cadastrado.');
      } else if (cod === 'operacao-bloqueada') {
        toast.erro('Cadastro por e-mail/senha não habilitado no Firebase.');
      } else {
        toast.erro('Erro ao cadastrar advogado.');
      }
    }
    setSalvando(false);
  };

  const reenviar = async (a: Perfil) => {
    setMenuId(null);
    if (!confirm(`Reenviar e-mail de definição de senha para ${a.email}?`)) return;
    try {
      await reenviarAcessoAdvogado(a.email);
      toast.sucesso('E-mail reenviado para ' + a.email);
    } catch {
      toast.erro('Erro ao reenviar e-mail.');
    }
  };

  const excluir = async (a: Perfil) => {
    setMenuId(null);
    if (!confirm(`Excluir o advogado "${a.nome}"? Esta ação é irreversível.`)) return;
    try {
      await db.deletePerfil(a.id);
      toast.sucesso('Advogado excluído.');
      carregar();
    } catch (err) {
      toast.erro('Erro ao excluir advogado.');
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
          <h1 className="font-serif text-3xl text-brand-900">Advogados</h1>
          <p className="text-ink-500 mt-1">Gestão da equipe do escritório.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => abrirConvite()} className="btn-secondary">
            <Mail size={18} /> Enviar convite
          </button>
          <button onClick={abrirNovo} className="btn-primary">
            <Plus size={18} /> Novo advogado
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      ) : advogados.length === 0 ? (
        <div className="card p-12 text-center">
          <Scale size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhum advogado cadastrado ainda.</p>
          <p className="text-ink-400 text-sm mt-1">Clique em "Novo advogado" para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {advogados.map((a) => (
            <div key={a.id} className="card p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                {a.foto_url ? (
                  <img
                    src={a.foto_url}
                    alt={`Foto de ${a.nome}`}
                    className="w-12 h-12 rounded-xl object-cover bg-brand-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                    <Scale size={22} className="text-brand-700" />
                  </div>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuId(menuId === a.id ? null : a.id)}
                    className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuId === a.id && (
                    <div className="absolute right-0 top-9 z-10 bg-white rounded-lg shadow-lg border border-ink-100 py-1 w-48 animate-scale-in">
                      <button
                        onClick={() => abrirEditar(a)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => reenviar(a)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
                      >
                        <MailOpen size={14} /> Reenviar acesso
                      </button>
                      <button
                        onClick={() => excluir(a)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="font-serif text-lg text-brand-900">{a.nome}</h3>
              <p className="text-xs text-ink-400 mb-4 flex items-center gap-1.5">
                <UserCheck size={12} /> Advogado · OAB
              </p>
              <div className="space-y-1.5 text-sm">
                <p className="text-ink-600 flex items-center gap-2">
                  <Mail size={14} className="text-ink-400" /> {a.email}
                </p>
                {a.telefone && (
                  <p className="text-ink-600 flex items-center gap-2">
                    <Phone size={14} className="text-ink-400" /> {formatarTelefone(a.telefone)}
                  </p>
                )}
                <p className="text-xs text-ink-400 pt-2">Cadastrado em {formatarData(a.criado_em)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar advogado */}
      <Modal aberto={modo === 'novo' || modo === 'editar'} onFechar={fecharModal} titulo={modo === 'editar' ? 'Editar advogado' : 'Novo advogado'}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo *</label>
            <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-field" placeholder="Nome do advogado" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="advogado@escritorio.com"
              disabled={modo === 'editar'}
              title={modo === 'editar' ? 'O e-mail de acesso não pode ser alterado' : undefined}
            />
            {modo === 'editar' && (
              <p className="text-xs text-ink-400 mt-1">O e-mail de acesso não pode ser alterado.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input-field" placeholder="(00) 00000-0000" />
          </div>
          {modo === 'editar' && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">CPF</label>
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="input-field" placeholder="000.000.000-00" />
            </div>
          )}

          {/* Foto / avatar do advogado */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Foto do advogado</label>
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  ref={fotoInputRef}
                  onChange={handleFotoChange}
                  className="hidden"
                />
                <img
                  src={
                    (fotoPreview && !removerFoto)
                      ? fotoPreview
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(form.nome || 'A')}&background=0284c7&color=fff&size=128`
                  }
                  alt="Prévia da foto"
                  className="w-16 h-16 rounded-full object-cover bg-brand-100"
                />
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Escolher foto"
                >
                  {uploadingFoto ? '...' : <Upload size={20} />}
                </button>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="btn-secondary text-sm"
                >
                  <Upload size={14} /> Escolher imagem
                </button>
                {fotoPreview && !removerFoto && (
                  <button
                    type="button"
                    onClick={removerFotoSelecionada}
                    disabled={uploadingFoto}
                    className="block text-sm text-danger-600 hover:text-danger-700"
                  >
                    <X size={14} className="inline" /> Remover foto
                  </button>
                )}
                <p className="text-xs text-ink-400">JPG ou PNG, máx. 700KB.</p>
              </div>
            </div>
          </div>

          {modo === 'novo' && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
              <MailOpen size={20} className="text-brand-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-900">Acesso ao painel administrativo</p>
                <p className="text-xs text-ink-600 mt-1">
                  O advogado receberá um e-mail em <strong>{form.email || '—'}</strong> com
                  um link para definir sua própria senha e acessar a área do advogado.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? (modo === 'editar' ? 'Salvando…' : 'Cadastrando…') : (modo === 'editar' ? 'Salvar alterações' : 'Cadastrar e enviar acesso')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Enviar convite — monta e-mail com link para /cadastro */}
      <Modal aberto={modo === 'convite'} onFechar={fecharModal} titulo="Enviar convite de cadastro">
        <form onSubmit={enviarConviteDoModal} className="space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
            <Mail size={20} className="text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-ink-700">
                Vamos abrir seu aplicativo de e-mail com uma mensagem pronta convidando o
                destinatário a criar o acesso de <strong>advogado</strong> à área da equipe.
                Você revisa e envia.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome do destinatário</label>
            <input
              list="convite-advogados"
              value={conviteForm.nome}
              onChange={(e) => setConviteForm((v) => ({ ...v, nome: e.target.value }))}
              className="input-field"
              placeholder="Ex.: Maria Silva"
            />
            <datalist id="convite-advogados">
              {advogados.map((a) => (
                <option key={a.id} value={a.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail do destinatário *</label>
            <input
              type="email"
              required
              list="convite-advogados-emails"
              value={conviteForm.email}
              onChange={(e) => setConviteForm((v) => ({ ...v, email: e.target.value }))}
              className="input-field"
              placeholder="cliente@email.com"
            />
            <datalist id="convite-advogados-emails">
              {advogados.map((a) => (
                <option key={a.id} value={a.email} />
              ))}
            </datalist>
            <p className="text-xs text-ink-400 mt-1">
              Dica: você pode digitar ou escolher um advogado já cadastrado na lista.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={gerandoConvite} className="btn-primary">
              {gerandoConvite ? 'Gerando…' : 'Preparar e-mail de convite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
