import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

export default function EsqueciSenhaPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setErro(error);
      return;
    }
    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/"><Logo comTexto /></Link>
          <Link to="/login" className="btn-ghost">
            <ChevronLeft size={18} />
            Voltar ao login
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="font-serif text-3xl text-brand-900 mb-2">Recuperar senha</h2>
          <p className="text-ink-500 mb-8">
            Informe seu e-mail para receber um link de redefinição.
          </p>

          {enviado ? (
            <div className="bg-success-50 border border-success-100 rounded-lg p-6 flex items-start gap-3 animate-fade-in">
              <CheckCircle2 size={24} className="text-success-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-success-700">E-mail enviado!</p>
                <p className="text-sm text-success-600 mt-1">
                  Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.
                </p>
              </div>
            </div>
          ) : (
            <>
              {erro && (
                <div className="mb-6 flex items-start gap-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg p-4">
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
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Enviando…' : 'Enviar link'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
