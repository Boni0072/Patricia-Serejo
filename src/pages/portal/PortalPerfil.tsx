import { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Save, Shield, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as db from '../../lib/db';
import { toast } from '../../components/Toast';
import { formatarTelefone, formatarCPF } from '../../lib/utils';
import type { Cliente } from '../../types/database';

export default function PortalPerfil() {
  const { perfil, user, refreshPerfil } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (perfil?.cliente_id) {
      db.getCliente(perfil.cliente_id).then((c) => {
        if (c) {
          setCliente(c);
          setNome(c.nome);
          setTelefone(c.telefone || '');
        }
      })
      .finally(() => setLoading(false));
    } else if (perfil || !user) {
      // Perfil existe mas não é cliente (admin/advogado), ou usuário deslogou
      setLoading(false);
    }
  }, [perfil, user]);

  const salvar = async () => {
    if (!user || !cliente) return;
    setSalvando(true);
    try {
      // Atualiza tanto o perfil (para useAuth) quanto o cliente (para o admin)
      await Promise.all([
        db.cliente.updatePerfil(user.uid, { nome, telefone }),
        db.updateCliente(cliente.id, { nome, telefone: telefone || null }),
      ]);
      await refreshPerfil();
      toast.sucesso('Perfil atualizado!');
    } catch {
      toast.erro('Erro ao salvar perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !perfil) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast.erro('Imagem muito grande (máx. 2MB).');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await db.cliente.updatePerfil(user.uid, { foto_url: base64 });
        await refreshPerfil();
        toast.sucesso('Sua foto foi atualizada!');
      } catch (err) {
        toast.erro('Erro ao salvar a foto.');
        console.error(err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Meu Perfil</h1>
        <p className="text-ink-500 mt-1">Gerencie seus dados de contato e acesso.</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group shrink-0">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadFoto} className="hidden" />
            <img
              src={cliente?.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente?.nome || 'C')}&background=0284c7&color=fff&size=128`}
              alt={`Foto de ${cliente?.nome}`}
              className="w-16 h-16 rounded-full object-cover bg-brand-100"
            />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? '...' : <Upload size={20} />}
            </button>
          </div>
          <div>
            <p className="font-serif text-xl text-brand-900">{cliente?.nome}</p>
            <p className="text-sm text-ink-500">
              {perfil?.papel === 'admin' ? 'Administrador' : perfil?.papel === 'advogado' ? 'Advogado(a)' : 'Cliente'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={perfil?.email || ''} disabled className="input-field pl-10 bg-ink-50" />
            </div>
            <p className="text-xs text-ink-400 mt-1">O e-mail não pode ser alterado.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Telefone</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="input-field pl-10"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">CPF</label>
              <input
                value={perfil?.cpf ? formatarCPF(perfil.cpf) : ''}
                disabled
                className="input-field bg-ink-50"
              />
            </div>
          </div>
          <button onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : (<><Save size={18} /> Salvar alterações</>)}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-brand-700 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-brand-900 text-sm">Privacidade e LGPD</h3>
            <p className="text-xs text-ink-500 mt-1 leading-relaxed">
              Seus dados são tratados conforme a LGPD. Você pode solicitar a exclusão dos
              seus dados entrando em contato com o escritório.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
