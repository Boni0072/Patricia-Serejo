import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Phone, ChevronLeft, AlertCircle, ArrowRight, ShieldCheck, Scale, Upload, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';
import Logo from '../../components/Logo';
import { apenasDigitos, mascaraCPF } from '../../lib/utils';
import { uploadDocumento, LIMITE_BASE64_BYTES } from '../../lib/storage';
import { getConviteAdvogado } from '../../lib/db';

export default function CadastroAdvogadoPage() {
  const { signUpAdvogado } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

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
  // Estado de validação do token: 'verificando' | 'valido' | 'invalido'
  const [statusToken, setStatusToken] = useState<'verificando' | 'valido' | 'invalido'>('verificando');
  // Foto / avatar do advogado (opcional)
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > LIMITE_BASE64_BYTES) {
      setErro('Imagem muito grande. Máx. 700KB.');
      e.target.value = '';
      return;
    }
    setErro(null);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removerFotoSelecionada = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  // Valida o token ao abrir a página e pré-preenche o e-mail do convite.
  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!token) {
        setStatusToken('invalido');
        setErro('Link de convite inválido. Solicite um novo convite ao administrador.');
        return;
      }
      try {
        const convite = await getConviteAdvogado(token);
        if (!ativo) return;
        if (!convite) {
          setStatusToken('invalido');
          setErro('Convite não encontrado. Solicite um novo convite ao administrador.');
          return;
        }
        if (convite.usado) {
          setStatusToken('invalido');
          setErro('Este convite já foi utilizado.');
          return;
        }
        if (new Date(convite.expira_em).getTime() < Date.now()) {
          setStatusToken('invalido');
          setErro('Este convite expirou. Peça um novo ao administrador.');
          return;
        }
        setForm((f) => ({ ...f, email: convite.email }));
        setStatusToken('valido');
      } catch {
        if (!ativo) return;
        setStatusToken('invalido');
        setErro('Não foi possível validar o convite. Tente novamente.');
      }
    })();
    return () => {
      ativo = false;
    };
  }, [token]);

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
    // Converte a foto escolhida (se houver) para base64 antes de criar a conta,
    // para já salvá-la no perfil do advogado (campo foto_url).
    let foto_url: string | null = null;
    if (fotoFile) {
      try {
        setUploadingFoto(true);
        foto_url = await uploadDocumento(`advogados/${fotoFile.name}`, fotoFile);
      } catch (err) {
        setUploadingFoto(false);
        setLoading(false);
        setErro('Não foi possível processar a foto. Tente uma imagem menor.');
        return;
      }
      setUploadingFoto(false);
    }
    const { error } = await signUpAdvogado({
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      telefone: apenasDigitos(form.telefone),
      cpf: apenasDigitos(form.cpf),
      token,
      foto_url,
    });
    setLoading(false);

    if (error) {
      setErro(error);
      return;
    }
    toast.sucesso('Conta de advogado criada com sucesso!');
    navigate('/portal');
  };

  // Tela de token inválido/expirado/utilizado.
  if (statusToken === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 p-6">
        <div className="w-full max-w-md card p-8 text-center">
          <AlertCircle size={40} className="text-danger-500 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-brand-900 mb-2">Convite indisponível</h1>
          <p className="text-ink-500 text-sm mb-6">{erro}</p>
          <Link to="/login" className="btn-primary w-full justify-center">
            Ir para o login
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
            Cadastro de<br />advogado
          </h1>
          <p className="text-brand-200 leading-relaxed max-w-md">
            Você foi convidado para integrar a equipe do escritório. Crie sua conta para
            acessar a área do advogado e gerenciar processos e clientes.
          </p>
        </div>
        <p className="relative text-brand-400 text-xs">© {new Date().getFullYear()} Patricia Cristiane Serejo Advocacia</p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-ink-500 hover:text-brand-800 text-sm transition-colors">
              <ChevronLeft size={16} /> Voltar
            </Link>
            <div className="flex items-center gap-2 mt-4">
              <Scale size={22} className="text-brand-700" />
              <h2 className="font-serif text-2xl text-brand-900">Criar conta de advogado</h2>
            </div>
            <p className="text-ink-500 text-sm mt-1">Preencha os dados abaixo para finalizar seu cadastro.</p>
          </div>

          {statusToken === 'verificando' ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
              <p className="text-ink-500 text-sm">Validando convite…</p>
            </div>
          ) : (
            <>
              {erro && (
                <div className="mb-4 flex items-start gap-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg p-4 animate-fade-in">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-sm">{erro}</p>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    className="input-field"
                    placeholder="Seu nome completo"
                  />
                </div>

                {/* Foto / avatar do advogado (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Foto do perfil (opcional)</label>
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
                          fotoPreview ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(form.nome || 'A')}&background=0284c7&color=fff&size=128`
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
                        {uploadingFoto ? '…' : <Upload size={20} />}
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
                      {fotoPreview && (
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

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className="input-field pl-10 bg-ink-50"
                      placeholder="voce@escritorio.com"
                    />
                  </div>
                  <p className="text-xs text-ink-400 mt-1">
                    E-mail definido no convite. Deve corresponder ao endereço convidado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    e autorizo o tratamento dos meus dados pessoais, em conformidade com a LGPD.
                  </span>
                </label>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Criando conta…' : 'Criar conta de advogado'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
                <ShieldCheck size={14} />
                Dados protegidos — LGPD
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


