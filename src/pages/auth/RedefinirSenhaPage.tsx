import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../../lib/firebaseClient';
import { updatePassword } from 'firebase/auth';
import { toast } from '../../components/Toast';
import Logo from '../../components/Logo';

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser!, senha);
    } catch (e) {
      setLoading(false);
      setErro((e as Error).message);
      return;
    }
    setLoading(false);
    setFeito(true);
    toast.sucesso('Senha redefinida com sucesso!');
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center">
          <Link to="/"><Logo comTexto /></Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="font-serif text-3xl text-brand-900 mb-2">Redefinir senha</h2>
          <p className="text-ink-500 mb-8">Digite sua nova senha.</p>

          {feito ? (
            <div className="bg-success-50 border border-success-100 rounded-lg p-6 flex items-start gap-3 animate-fade-in">
              <CheckCircle2 size={24} className="text-success-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-success-700">Senha atualizada!</p>
                <p className="text-sm text-success-600 mt-1">Redirecionando para o login…</p>
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
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="password"
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
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
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Salvando…' : 'Redefinir senha'}
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
