import { useState } from 'react';
import { Mail, Phone, User as UserIcon, Briefcase, Save, Loader2, Camera, Shield, Clock, Check, AlertCircle, KeyRound, Monitor, LogOut } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Field } from './ui/Select';
import { Badge } from './ui/Badge';
import { formatDate } from '../lib/format';
import type { Usuario, UsuarioInput } from '../types/usuarios';
import { PERFIL_DESCRICOES } from '../types/usuarios';

interface Props {
  usuario: Usuario | null;
  onUpdate: (id: string, input: Partial<UsuarioInput>) => Promise<{ error: string | null }>;
}

export function ProfileTab({ usuario, onUpdate }: Props) {
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [cargo, setCargo] = useState(usuario?.cargo ?? '');
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!usuario) {
    return (
      <Card padding="md">
        <p className="text-sm text-content-muted">Nenhum usuário autenticado.</p>
      </Card>
    );
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error } = await onUpdate(usuario.id, {
      nome: nome.trim(),
      cargo: cargo.trim() || null,
      telefone: telefone.trim() || null,
    });
    setSaving(false);
    if (error) setError(error);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const iniciais = (usuario.nome || usuario.email)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card de identidade */}
        <Card padding="lg" className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-accent to-accent-hover grid place-items-center text-page font-bold text-2xl shadow-glow">
                {iniciais || 'U'}
              </div>
              <button className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-surface border border-border-subtle grid place-items-center text-content-muted hover:text-content hover:bg-surface-hover transition-colors" title="Alterar foto (em breve)">
                <Camera size={14} />
              </button>
            </div>
            <h3 className="mt-4 text-base font-semibold text-content">{usuario.nome}</h3>
            <p className="text-xs text-content-muted mt-0.5">{usuario.cargo || usuario.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <Badge tone="info" dot>{usuario.perfil}</Badge>
              <Badge tone={usuario.status === 'ativo' ? 'success' : usuario.status === 'suspenso' ? 'danger' : 'neutral'}>
                {usuario.status}
              </Badge>
            </div>
            <div className="mt-5 w-full space-y-2.5 text-left">
              <div className="flex items-center gap-2.5 text-xs">
                <Mail size={14} className="text-content-muted shrink-0" />
                <span className="text-content truncate">{usuario.email}</span>
              </div>
              {usuario.telefone && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone size={14} className="text-content-muted shrink-0" />
                  <span className="text-content">{usuario.telefone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-xs">
                <Clock size={14} className="text-content-muted shrink-0" />
                <span className="text-content-muted">Desde {formatDate(usuario.criado_em)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Formulário de edição */}
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader title="Dados do perfil" subtitle="Atualize suas informações pessoais e de contato." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome completo">
              <div className="relative">
                <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="pl-9" />
              </div>
            </Field>
            <Field label="Cargo / função">
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Controller" className="pl-9" />
              </div>
            </Field>
            <Field label="E-mail (somente leitura)">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input value={usuario.email} readOnly disabled className="pl-9 opacity-70" />
              </div>
            </Field>
            <Field label="Telefone">
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 11 99999-9999" className="pl-9" />
              </div>
            </Field>
            <Field label="Bio" className="sm:col-span-2">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você e seu papel na empresa…" rows={3} />
            </Field>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="primary" leftIcon={saved ? <Check size={15} /> : saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} onClick={save} disabled={saving}>
              {saved ? 'Salvo!' : saving ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Segurança e sessões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="md">
          <CardHeader title="Segurança" subtitle="Credenciais e dispositivos associados à sua conta." />
          <div className="space-y-2.5">
            <SegItem icon={KeyRound} title="Senha de acesso" subtitle="Última alteração há 30 dias">
              <Button variant="outline" size="sm">Alterar senha</Button>
            </SegItem>
            <SegItem icon={Shield} title="Autenticação em 2 fatores" subtitle="Proteção adicional no login">
              <Button variant="outline" size="sm">Ativar 2FA</Button>
            </SegItem>
            <SegItem icon={Monitor} title="Sessões ativas" subtitle="2 dispositivos conectados">
              <Button variant="ghost" size="sm">Gerenciar</Button>
            </SegItem>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Perfil de acesso" subtitle="Permissões associadas ao seu papel." />
          <div className="p-3 rounded-lg bg-page border border-border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={15} className="text-accent" />
              <p className="text-sm font-medium text-content">{usuario.perfil}</p>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">{PERFIL_DESCRICOES[usuario.perfil]}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-content-muted">
            <LogOut size={13} />
            <span>Para encerrar a sessão, use o botão Sair no menu lateral.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SegItem({ icon: Icon, title, subtitle, children }: { icon: typeof Shield; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-page border border-border-subtle">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-surface-hover grid place-items-center shrink-0">
          <Icon size={15} className="text-content-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-content truncate">{title}</p>
          <p className="text-xs text-content-muted truncate">{subtitle}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
