import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, ChevronLeft, AlertCircle, ArrowRight, ShieldCheck, UserCog, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';
import Logo from '../../components/Logo';
import { apenasDigitos, mascaraCPF } from '../../lib/utils';

export default function CadastroPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Quando o cliente chega por um link de convite, o uid do advogado que
  // enviou vem em ?advogado=<uid> e é usado para vincular o cadastro a ele.
  // O nome (advogado_nome) é apenas para exibição em campo não editável —
  // nenhum e-mail/senha do advogado é usado no cadastro.
  const advogadoId = searchParams.get('advogado');
  const advogadoNome = searchParams.get('advogado_nome');
  console.log('[CadastroPage] advogado_id lido da URL:', advogadoId, '| query string completa:', window.location.search);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmar: '',
  });
  const [consentiu, setConsentiu] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (form.senha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (form.senha !== form.confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (apenasDigitos(form.cpf).length !== 11) {
      setErro('CPF inválido. Digite os 11 dígitos.');
      return;
    }
    if (!consentiu) {
      setErro('É necessário consentir com a Política de Privacidade.');
      return;
    }

    setLoading(true);
    const { error } = await signUp({
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      telefone: apenasDigitos(form.telefone),
      cpf: apenasDigitos(form.cpf),
      advogado_id: advogadoId,
    });
    setLoading(false);

    if (error) {
      setErro(error);
      return;
    }
    toast.sucesso('Conta criada! Verifique seu e-mail se necessário.');
    navigate('/portal');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-50">
      <div className="lg:w-1/2 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 relative overflow-hidden hidden lg:flex flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Link to="/" className="relative">
          <Logo comTexto variante="claro" />
        </Link>
        <div className="relative">
          <h1 className="font-serif text-4xl text-white leading-tight mb-4">
            Cadastre-se no<br />portal do cliente
          </h1>
          <p className="text-brand-200 leading-relaxed max-w-md">
            Crie sua conta para acompanhar processos, enviar documentos e conversar
            com o escritório de forma segura.
          </p>
        </div>
        <p className="relative text-brand-400 text-xs">© {new Date().getFullYear()} Patricia Cristiane Serejo Advocacia</p>
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

          <h2 className="font-serif text-3xl text-brand-900 mb-2">Criar conta</h2>
          <p className="text-ink-500 mb-8">Preencha seus dados para se cadastrar.</p>

          {advogadoId && (
            <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-100 text-brand-800 rounded-lg p-4 animate-fade-in">
              <UserCog size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">
                Você recebeu um convite do escritório. Ao concluir o cadastro, sua conta
                será vinculada automaticamente ao advogado que enviou este link.
              </p>
            </div>
          )}

          {erro && (
            <div className="mb-6 flex items-start gap-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg p-4 animate-fade-in">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{erro}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {advogadoId && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Advogado responsável</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 border border-brand-100 rounded-lg text-brand-900">
                  <Scale size={16} className="shrink-0 text-brand-700" />
                  <span className="text-sm font-medium">
                    {advogadoNome || 'Advogado do escritório'}
                  </span>
                  <span className="ml-auto text-xs text-ink-400">(definido automaticamente)</span>
                </div>
                <p className="text-xs text-ink-400 mt-1">
                  Seu cadastro será vinculado a este advogado. Não é possível alterar aqui.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  className="input-field pl-10"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="input-field pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    required
                    value={form.telefone}
                    onChange={(e) => set('telefone', e.target.value)}
                    className="input-field pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">CPF</label>
                <input
                  required
                  value={form.cpf}
                  onChange={(e) => set('cpf', mascaraCPF(e.target.value))}
                  className="input-field"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  value={form.senha}
                  onChange={(e) => set('senha', e.target.value)}
                  className="input-field pl-10"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Confirmar senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  value={form.confirmar}
                  onChange={(e) => set('confirmar', e.target.value)}
                  className="input-field pl-10"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-brand-50 rounded-lg border border-brand-100">
              <input
                type="checkbox"
                checked={consentiu}
                onChange={(e) => setConsentiu(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-700"
              />
              <span className="text-xs text-ink-600 leading-relaxed">
                Li e concordo com a{' '}
                <Link to="/politica-privacidade" target="_blank" className="text-brand-700 hover:underline">
                  Política de Privacidade
                </Link>{' '}
                e autorizo o tratamento dos meus dados pessoais para fins de gestão de
                processos, em conformidade com a LGPD.
              </span>
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Criando conta…' : 'Criar conta'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-700 hover:text-brand-900 font-medium">
              Entrar
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
            <ShieldCheck size={14} />
            Dados protegidos — LGPD
          </div>
        </div>
      </div>
    </div>
  );
}
