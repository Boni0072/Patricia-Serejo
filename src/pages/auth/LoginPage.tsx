import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, ChevronLeft, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';
import Logo from '../../components/Logo';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;

  const params = new URLSearchParams(location.search);
  const modoAdmin = params.get('area') === 'admin';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const { error, papel } = await signIn(email, senha);
    setLoading(false);
    if (error) {
      setErro(error);
      return;
    }
    toast.sucesso('Login realizado com sucesso!');
    if (from) {
      navigate(from);
    } else if (modoAdmin) {
      if (papel === 'admin' || papel === 'advogado') {
        navigate('/admin');
      } else {
        setErro('Você não tem permissão para acessar a área do advogado.');
      }
    } else if (papel === 'admin' || papel === 'advogado') {
      navigate('/admin');
    } else {
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-50">
      {/* Lado esquerdo - branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 relative overflow-hidden hidden lg:flex flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: modoAdmin
              ? 'url(https://images.pexels.com/photos/5668882/pexels-photo-5668882.jpeg?auto=compress&cs=tinysrgb&w=1200)'
              : 'url(https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg?auto=compress&cs=tinysrgb&w=1200)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Link to="/" className="relative">
          <Logo comTexto variante="claro" />
        </Link>
        <div className="relative">
          {modoAdmin ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/20 border border-gold-400/30 mb-4">
                <Shield size={13} className="text-gold-300" />
                <span className="text-xs font-medium text-gold-200 tracking-wide">Painel Administrativo</span>
              </div>
              <h1 className="font-serif text-4xl text-white leading-tight mb-4">
                Área exclusiva<br />dos advogados
              </h1>
              <p className="text-brand-200 leading-relaxed max-w-md">
                Gerencie clientes, processos, agenda e mensagens do escritório em um único painel completo.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-4xl text-white leading-tight mb-4">
                Acompanhe seus processos<br />com transparência
              </h1>
              <p className="text-brand-200 leading-relaxed max-w-md">
                Acesse o portal do cliente para visualizar o andamento dos seus processos,
                enviar documentos e conversar diretamente com o escritório.
              </p>
            </>
          )}
        </div>
        <p className="relative text-brand-400 text-xs">
          © {new Date().getFullYear()} Patricia Cristiane Serejo Advocacia
        </p>
      </div>

      {/* Lado direito - formulário */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link
              to={modoAdmin ? '/login' : '/'}
              className="inline-flex items-center gap-2 text-ink-500 hover:text-brand-800 text-sm transition-colors"
            >
              <ChevronLeft size={16} />
              {modoAdmin ? 'Acesso do cliente' : 'Voltar ao site'}
            </Link>
            <div className="mt-6 lg:hidden">
              <Logo comTexto />
            </div>
          </div>

          {modoAdmin ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Shield size={18} className="text-brand-700" />
                </div>
                <h2 className="font-serif text-3xl text-brand-900">Área do Advogado</h2>
              </div>
              <p className="text-ink-500 mb-8">Entre com suas credenciais profissionais.</p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl text-brand-900 mb-2">Bem-vindo de volta</h2>
              <p className="text-ink-500 mb-8">Entre com suas credenciais para acessar o sistema.</p>
            </>
          )}

          {erro && (
            <div className="mb-6 flex items-start gap-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg p-4 animate-fade-in">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{erro}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-700">Senha</label>
                <Link to="/esqueci-senha" className="text-xs text-brand-700 hover:text-brand-900">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Entrando…' : 'Entrar'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink-100">
            {modoAdmin ? (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-ink-600 bg-ink-50 hover:bg-ink-100 rounded-lg transition-colors"
              >
                <UserRound size={16} />
                Sou cliente — acessar meu portal
              </Link>
            ) : (
              <Link
                to="/login?area=admin"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
              >
                <Shield size={16} />
                Acesso do advogado
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
