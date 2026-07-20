import { useState } from 'react';
import { User, Mail, Phone, Save, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as db from '../../lib/db';
import { toast } from '../../components/Toast';
import { formatarTelefone, formatarCPF } from '../../lib/utils';

export default function PortalPerfil() {
  const { perfil, user, refreshPerfil } = useAuth();
  const [nome, setNome] = useState(perfil?.nome || '');
  const [telefone, setTelefone] = useState(perfil?.telefone || '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!user) return;
    setSalvando(true);
    try {
      await db.updatePerfil(user.uid, { nome, telefone });
    } catch {
      setSalvando(false);
      toast.erro('Erro ao salvar perfil.');
      return;
    }
    setSalvando(false);
    await refreshPerfil();
    toast.sucesso('Perfil atualizado!');
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Meu Perfil</h1>
        <p className="text-ink-500 mt-1">Atualize seus dados pessoais.</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-800 flex items-center justify-center">
            <User size={28} className="text-gold-400" />
          </div>
          <div>
            <p className="font-serif text-xl text-brand-900">{perfil?.nome}</p>
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
