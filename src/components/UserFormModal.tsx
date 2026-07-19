import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, User as UserIcon, Briefcase, Save, Loader2, AlertCircle, Lock, Eye, EyeOff, Check, LayoutGrid, Shield } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, Field } from './ui/Select';
import { cn } from '../lib/format';
import { NAV_ITEMS } from './Sidebar';
import { PERFIS, MODULOS_ACESSO } from '../types/usuarios';
import type { Usuario, UsuarioInput, UsuarioStatus, ModuloAcesso } from '../types/usuarios';
import type { Perfil } from '../hooks/useAuth';
import { acessosDoUsuario } from '../hooks/useUsuarios';

interface Props {
  open: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  acessos?: ModuloAcesso[];
  onUpsertAcesso?: (acesso: Partial<ModuloAcesso> & { usuario_id: string; modulo_id: string }) => Promise<{ error: string | null }>;
  onSave: (input: UsuarioInput, id?: string, senha?: string) => Promise<{ error: string | null; id?: string }>;
  onResetSenha?: (email: string) => Promise<{ error: string | null }>;
  onAtualizarSenha?: (email: string, novaSenha: string) => Promise<{ error: string | null }>;
}

const GRUPO_ORDEM = ['Executivo', 'Financeiro', 'Operacional', 'Sistema'] as const;

const STATUSES: UsuarioStatus[] = ['ativo', 'inativo', 'suspenso'];

export function UserFormModal({ open, onClose, usuario, acessos = [], onUpsertAcesso, onSave, onResetSenha, onAtualizarSenha }: Props) {
  const isEdit = Boolean(usuario);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('Diretoria');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState<UsuarioStatus>('ativo');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [senhaAlterada, setSenhaAlterada] = useState(false);
  const [paginasSelecionadas, setPaginasSelecionadas] = useState<Set<string>>(new Set());
  const [busyPagina, setBusyPagina] = useState<string | null>(null);

  const isAdmin = perfil === 'Administrador';

  const iconById = useMemo(() => {
    const map: Record<string, typeof Eye> = {};
    NAV_ITEMS.forEach((n) => { map[n.id] = n.icon; });
    return map;
  }, []);

  useEffect(() => {
    if (open) {
      setNome(usuario?.nome ?? '');
      setEmail(usuario?.email ?? '');
      setPerfil((usuario?.perfil as Perfil) ?? 'Diretoria');
      setCargo(usuario?.cargo ?? '');
      setTelefone(usuario?.telefone ?? '');
      setStatus(usuario?.status ?? 'ativo');
      setSenha('');
      setConfirmarSenha('');
      setMostrarSenha(false);
      setError(null);
      setResetEnviado(false);
      setSenhaAlterada(false);
      if (usuario && acessos.length) {
        const ids = acessos.filter((a) => a.usuario_id === usuario.id && a.pode_visualizar).map((a) => a.modulo_id);
        setPaginasSelecionadas(new Set(ids));
      } else {
        setPaginasSelecionadas(new Set());
      }
    }
  }, [open, usuario, acessos]);

  const togglePagina = async (moduloId: string) => {
    if (isAdmin || !onUpsertAcesso) return;
    const next = new Set(paginasSelecionadas);
    if (next.has(moduloId)) next.delete(moduloId); else next.add(moduloId);
    setPaginasSelecionadas(next);
    if (isEdit && usuario) {
      const atual = acessosDoUsuario(acessos, usuario.id, moduloId);
      setBusyPagina(moduloId);
      await onUpsertAcesso({
        usuario_id: usuario.id,
        modulo_id: moduloId,
        pode_visualizar: next.has(moduloId),
        pode_editar: atual?.pode_editar ?? false,
        pode_exportar: atual?.pode_exportar ?? false,
        pode_administrar: atual?.pode_administrar ?? false,
      });
      setBusyPagina(null);
    }
  };

  const marcarGrupo = (grupo: string, valor: boolean) => {
    if (isAdmin) return;
    const next = new Set(paginasSelecionadas);
    MODULOS_ACESSO.filter((m) => m.grupo === grupo).forEach((m) => {
      if (valor) next.add(m.id); else next.delete(m.id);
    });
    setPaginasSelecionadas(next);
    if (isEdit && usuario && onUpsertAcesso) {
      MODULOS_ACESSO.filter((m) => m.grupo === grupo).forEach(async (m) => {
        const atual = acessosDoUsuario(acessos, usuario.id, m.id);
        await onUpsertAcesso({
          usuario_id: usuario.id,
          modulo_id: m.id,
          pode_visualizar: valor,
          pode_editar: atual?.pode_editar ?? false,
          pode_exportar: atual?.pode_exportar ?? false,
          pode_administrar: atual?.pode_administrar ?? false,
        });
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!isEdit) {
      if (!senha) { setError('Defina uma senha para o usuário.'); return; }
      if (senha.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
      if (senha !== confirmarSenha) { setError('As senhas não coincidem.'); return; }
    } else if (senha) {
      if (senha.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
      if (senha !== confirmarSenha) { setError('As senhas não coincidem.'); return; }
    }
    setSaving(true);
    setError(null);
    const input: UsuarioInput = {
      nome: nome.trim(),
      email: email.trim(),
      perfil,
      cargo: cargo.trim() || null,
      telefone: telefone.trim() || null,
      status,
    };
    if (isEdit && senha && onAtualizarSenha) {
      const { error: pwdErr } = await onAtualizarSenha(usuario!.email, senha);
      if (pwdErr) {
        setSaving(false);
        setError(pwdErr);
        return;
      }
      setSenhaAlterada(true);
    }
    const senhaFinal = isEdit ? undefined : senha;
    const result = await onSave(input, usuario?.id, senhaFinal);
    if (result.error) {
      setSaving(false);
      setError(result.error);
      return;
    }
    // Para novo usuário, aplica as páginas de acesso selecionadas após a criação.
    if (!isEdit && result.id && onUpsertAcesso && paginasSelecionadas.size > 0) {
      for (const moduloId of paginasSelecionadas) {
        await onUpsertAcesso({
          usuario_id: result.id,
          modulo_id: moduloId,
          pode_visualizar: true,
          pode_editar: false,
          pode_exportar: false,
          pode_administrar: false,
        });
      }
    }
    setSaving(false);
    onClose();
  };

  const handleResetSenha = async () => {
    if (!usuario?.email || !onResetSenha) return;
    setResetando(true);
    setError(null);
    const { error } = await onResetSenha(usuario.email);
    setResetando(false);
    if (error) setError(error);
    else { setResetEnviado(true); setTimeout(() => setResetEnviado(false), 3500); }
  };

  const forcaSenha = avaliarForcaSenha(senha);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuário' : 'Novo usuário'}
      subtitle={isEdit ? 'Altere os dados do usuário cadastrado.' : 'Cadastre um novo usuário, defina seu perfil e a senha de acesso.'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" leftIcon={saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome completo">
          <div className="relative">
            <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana Souza" className="pl-9" required />
          </div>
        </Field>

        <Field label="E-mail corporativo">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@empresa.com" className="pl-9" required />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Perfil de acesso">
            <Select value={perfil} onChange={(v) => setPerfil(v as Perfil)} options={PERFIS.map((p) => ({ label: p, value: p }))} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(v) => setStatus(v as UsuarioStatus)} options={STATUSES.map((s) => ({ label: s, value: s }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cargo / função">
            <div className="relative">
              <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Controller" className="pl-9" />
            </div>
          </Field>
          <Field label="Telefone">
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 11 99999-9999" className="pl-9" />
            </div>
          </Field>
        </div>

        {/* Senha */}
        <div className="space-y-3 p-3 rounded-lg bg-page border border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-content-muted" />
              <p className="text-sm font-medium text-content">
                {isEdit ? 'Redefinir senha' : 'Senha de acesso'}
              </p>
            </div>
            {isEdit && senhaAlterada && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <Check size={13} /> Senha atualizada
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={isEdit ? 'Nova senha (opcional)' : 'Senha'}>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setSenhaAlterada(false); }}
                  placeholder={isEdit ? 'Deixe vazio para manter' : 'Mín. 6 caracteres'}
                  className="pl-9 pr-9"
                  autoComplete={isEdit ? 'new-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar senha">
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder={isEdit ? 'Repita a nova senha' : 'Repita a senha'}
                  className="pl-9"
                  autoComplete="new-password"
                  disabled={!senha}
                />
              </div>
            </Field>
          </div>
          {senha && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${forcaSenha.cor}`}
                  style={{ width: `${forcaSenha.pct}%` }}
                />
              </div>
              <span className="text-xs text-content-muted w-20 text-right">{forcaSenha.label}</span>
            </div>
          )}
          {isEdit ? (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle">
              <p className="text-xs text-content-muted leading-relaxed flex-1">
                Preencha para definir uma nova senha agora, ou use o e-mail de redefinição.
              </p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={resetEnviado ? <Check size={14} /> : <Mail size={14} />}
                onClick={handleResetSenha}
                disabled={resetando || resetEnviado || !onResetSenha}
              >
                {resetando ? 'Enviando…' : resetEnviado ? 'E-mail enviado' : 'Enviar e-mail'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-content-muted leading-relaxed">
              Esta senha será usada no primeiro acesso. O usuário poderá redefini-la depois pela tela de login.
            </p>
          )}
        </div>

        {/* Páginas de acesso */}
        <div className="space-y-3 p-3 rounded-lg bg-page border border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={15} className="text-content-muted" />
              <p className="text-sm font-medium text-content">Páginas de acesso</p>
            </div>
            <span className="text-xs text-content-muted">
              {isAdmin ? 'Todas' : `${paginasSelecionadas.size}/${MODULOS_ACESSO.length}`}
            </span>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-md p-2">
              <Shield size={13} />
              <span>Administradores têm acesso a todas as páginas automaticamente.</span>
            </div>
          ) : (
            <p className="text-xs text-content-muted leading-relaxed">
              {isEdit
                ? 'Marque as páginas que este usuário poderá visualizar. As alterações são salvas automaticamente.'
                : 'Marque as páginas que este usuário poderá visualizar após a criação.'}
            </p>
          )}
          {!isAdmin && (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1 -mr-1">
              {GRUPO_ORDEM.map((grupo) => {
                const mods = MODULOS_ACESSO.filter((m) => m.grupo === grupo);
                return (
                  <div key={grupo}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted/70">{grupo}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => marcarGrupo(grupo, true)}
                          className="text-[10px] px-2 py-0.5 rounded text-content-muted hover:text-success hover:bg-success/10 transition-colors"
                        >
                          Todos
                        </button>
                        <span className="text-content-muted/40">·</span>
                        <button
                          type="button"
                          onClick={() => marcarGrupo(grupo, false)}
                          className="text-[10px] px-2 py-0.5 rounded text-content-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {mods.map((mod) => {
                        const on = paginasSelecionadas.has(mod.id);
                        const Icon = iconById[mod.id] ?? Eye;
                        const isBusy = busyPagina === mod.id;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => togglePagina(mod.id)}
                            disabled={isBusy}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
                              on
                                ? 'border-accent/40 bg-accent/8'
                                : 'border-border-subtle bg-surface hover:border-content-muted/40 hover:bg-surface-hover',
                              isBusy && 'opacity-50',
                            )}
                          >
                            <div className={cn(
                              'h-6 w-6 rounded-md grid place-items-center shrink-0',
                              on ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-content-muted/60',
                            )}>
                              <Icon size={13} />
                            </div>
                            <span className={cn('text-xs font-medium truncate flex-1', on ? 'text-content' : 'text-content-muted')}>{mod.label}</span>
                            <div className={cn(
                              'shrink-0 h-4 w-4 rounded grid place-items-center',
                              on ? 'bg-accent text-page' : 'bg-page border border-border-subtle',
                            )}>
                              {isBusy ? (
                                <span className="h-2 w-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              ) : on ? (
                                <Check size={11} />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

function avaliarForcaSenha(s: string): { pct: number; label: string; cor: string } {
  if (!s) return { pct: 0, label: '', cor: 'bg-content-muted/30' };
  let score = 0;
  if (s.length >= 6) score += 1;
  if (s.length >= 10) score += 1;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score += 1;
  if (/\d/.test(s)) score += 1;
  if (/[^a-zA-Z0-9]/.test(s)) score += 1;
  if (score <= 1) return { pct: 25, label: 'Fraca', cor: 'bg-danger' };
  if (score <= 3) return { pct: 60, label: 'Média', cor: 'bg-warning' };
  return { pct: 100, label: 'Forte', cor: 'bg-success' };
}
