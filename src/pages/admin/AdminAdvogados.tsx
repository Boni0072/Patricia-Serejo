import { useEffect, useState } from 'react';
import { Plus, Mail, Phone, MoreVertical, MailOpen, AlertCircle, Scale, UserCheck, Trash2 } from 'lucide-react';
import * as db from '../../lib/db';
import { criarContaAdvogado, reenviarAcessoAdvogado, codErroAuth, deleteUser } from '../../lib/authAdmin';
import { useAuth } from '../../context/AuthContext';
import type { Perfil } from '../../types/database';
import { formatarData, formatarTelefone } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

type ModoModal = 'fechado' | 'novo';

export default function AdminAdvogados() {
  const { perfil } = useAuth();
  const [advogados, setAdvogados] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<ModoModal>('fechado');
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' });
  const [salvando, setSalvando] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

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
    setForm({ nome: '', email: '', telefone: '' });
    setModo('novo');
  };

  const fecharModal = () => {
    setModo('fechado');
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarContaAdvogado({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || '',
      });
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
        <button onClick={abrirNovo} className="btn-primary">
          <Plus size={18} /> Novo advogado
        </button>
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
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                  <Scale size={22} className="text-brand-700" />
                </div>
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

      {/* Modal Novo advogado */}
      <Modal aberto={modo === 'novo'} onFechar={fecharModal} titulo="Novo advogado">
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo *</label>
            <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-field" placeholder="Nome do advogado" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="advogado@escritorio.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input-field" placeholder="(00) 00000-0000" />
          </div>

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

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Cadastrando…' : 'Cadastrar e enviar acesso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
