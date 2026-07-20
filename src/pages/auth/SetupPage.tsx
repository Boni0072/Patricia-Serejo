import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ChevronLeft, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import Logo from '../../components/Logo';
import { toast } from '../../components/Toast';
import { criarAdminInicial, existeAdmin } from '../../lib/authAdmin';

export default function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checando, setChecando] = useState(true);
  const [jaExisteAdmin, setJaExisteAdmin] = useState(false);

  useEffect(() => {
    existeAdmin()
      .then((existe) => {
        setJaExisteAdmin(existe);
        setChecando(false);
      })
      .catch(() => {
        setJaExisteAdmin(false);
        setChecando(false);
      });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (form.senha.length < 8) {
      setErro('A senha do administrador deve ter ao menos 8 caracteres.');
      return;
    }
    if (form.senha !== form.confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await criarAdminInicial({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
      });
      toast.sucesso('Administrador criado! Faça login para acessar o painel.');
      navigate('/login?area=admin');
    } catch (err) {
      const cod = (err as { code?: string })?.code ?? '';
      if (cod.includes('email-already-in-use')) {
        setErro('Este e-mail já está cadastrado. Faça login ou use "Esqueci a senha".');
      } else if (cod.includes('weak-password')) {
        setErro('A senha é muito fraca. Use ao menos 8 caracteres com letras e números.');
      } else if (cod.includes('invalid-email')) {
        setErro('E-mail inválido.');
      } else if (cod.includes('operation-not-allowed')) {
        setErro('O cadastro por e-mail/senha não está habilitado no Firebase.');
      } else {
        setErro('Ocorreu um erro ao criar o administrador. Tente novamente.');
      }
    }
    setLoading(false);
  };

  if (checando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-brand-700" />
          <p className="text-ink-500 text-sm">Verificando configuração…</p>
        </div>
      </div>
    );
  }

  if (jaExisteAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 p-6">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="font-serif text-2xl text-brand-900 mb-2">Administração já configurada</h1>
          <p className="text-ink-500 text-sm mb-6">
            Já existe um administrador cadastrado no sistema. Esta página de configuração
            inicial foi desativada por segurança.
          </p>
          <Link to="/login?area=admin" className="btn-primary w-full justify-center">
            Ir para o login <ArrowRight size={18} />
          </Link>
          <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-800">
            <ChevronLeft size={16} /> Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-50">
      <div className="lg:w-1/2 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 relative overflow-hidden hidden lg:flex flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/5668882/pexels-photo-5668882.jpeg?auto=compress&cs=tinysrgb&w=1200)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Link to="/" className="relative">
          <Logo comTexto variante="claro" />
        </Link>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/20 border border-gold-400/30 mb-4">
            <Shield size={13} className="text-gold-300" />
            <span className="text-xs font-medium text-gold-200 tracking-wide">Configuração inicial</span>
          </div>
          <h1 className="font-serif text-4xl text-white leading-tight mb-4">
            Criar o primeiro<br />administrador
          </h1>
          <p className="text-brand-200 leading-relaxed max-w-md">
            Esta etapa é executada apenas uma vez. O administrador poderá cadastrar
            advogados, clientes e gerenciar todo o escritório pelo painel.
          </p>
        </div>
        <p className="relative text-brand-400 text-xs">
          © {new Date().getFullYear()} Patricia Cristiane Serejo Advocacia
        </p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-ink-500 hover:text-brand-800 text-sm transition-colors">
              <ChevronLeft size={16} />
              Voltar ao site
            </Link>
            <div className="mt-6 lg:hidden">
              <Logo comTexto />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <Shield size={18} className="text-brand-700" />
            </div>
            <h2 className="font-serif text-3xl text-brand-900">Configuração inicial</h2>
          </div>
          <p className="text-ink-500 mb-8">Crie a conta do primeiro administrador do sistema.</p>

          {erro && (
            <div className="mb-6 flex items-start gap-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg p-4 animate-fade-in">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{erro}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input required value={form.nome} onChange={(e) => set('nome', e.target.value)} className="input-field pl-10" placeholder="Nome do responsável" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field pl-10" placeholder="admin@escritorio.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input type="password" required value={form.senha} onChange={(e) => set('senha', e.target.value)} className="input-field pl-10" placeholder="Mínimo 8 caracteres" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Confirmar senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input type="password" required value={form.confirmar} onChange={(e) => set('confirmar', e.target.value)} className="input-field pl-10" placeholder="Repita a senha" />
              </div>
            </div>

            <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 flex gap-3">
              <Shield size={20} className="text-gold-600 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-600 leading-relaxed">
                Esta conta terá acesso total ao painel administrativo, incluindo cadastro
                de advogados e clientes. Mantenha essas credenciais em segurança.
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Criando administrador…' : 'Criar administrador'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Já configurou?{' '}
            <Link to="/login?area=admin" className="text-brand-700 hover:text-brand-900 font-medium">
              Ir para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
