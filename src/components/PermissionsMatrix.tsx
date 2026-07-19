import { useMemo, useState } from 'react';
import { Eye, Edit3, Download, Shield, Check, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Select } from './ui/Select';
import { cn } from '../lib/format';
import { MODULOS_ACESSO, PERFIS } from '../types/usuarios';
import { acessosDoUsuario } from '../hooks/useUsuarios';
import type { Usuario, ModuloAcesso } from '../types/usuarios';

interface Props {
  usuarios: Usuario[];
  acessos: ModuloAcesso[];
  onAplicarTemplate: (usuarioId: string, perfil: string) => Promise<{ error: string | null }>;
  onUpsertAcesso: (acesso: Partial<ModuloAcesso> & { usuario_id: string; modulo_id: string }) => Promise<{ error: string | null }>;
}

interface PermissaoCol { key: keyof Pick<ModuloAcesso, 'pode_visualizar' | 'pode_editar' | 'pode_exportar' | 'pode_administrar'>; label: string; icon: typeof Eye; cor: string; }

const COLUNAS: PermissaoCol[] = [
  { key: 'pode_visualizar', label: 'Ver', icon: Eye, cor: 'text-info' },
  { key: 'pode_editar', label: 'Editar', icon: Edit3, cor: 'text-success' },
  { key: 'pode_exportar', label: 'Exportar', icon: Download, cor: 'text-warning' },
  { key: 'pode_administrar', label: 'Admin', icon: Shield, cor: 'text-danger' },
];

const GRUPOS = ['Executivo', 'Financeiro', 'Operacional', 'Sistema'] as const;

export function PermissionsMatrix({ usuarios, acessos, onAplicarTemplate, onUpsertAcesso }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(usuarios[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const usuario = useMemo(() => usuarios.find((u) => u.id === selectedId) ?? null, [usuarios, selectedId]);

  const flash = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2400);
  };

  const toggle = async (moduloId: string, col: PermissaoCol) => {
    if (!usuario) return;
    const atual = acessosDoUsuario(acessos, usuario.id, moduloId);
    const novoValor = !(atual?.[col.key] ?? false);
    setBusy(`${moduloId}:${col.key}`);
    const { error } = await onUpsertAcesso({
      usuario_id: usuario.id,
      modulo_id: moduloId,
      pode_visualizar: atual?.pode_visualizar ?? false,
      pode_editar: atual?.pode_editar ?? false,
      pode_exportar: atual?.pode_exportar ?? false,
      pode_administrar: atual?.pode_administrar ?? false,
      [col.key]: novoValor,
    });
    setBusy(null);
    if (error) flash('err', error);
  };

  const aplicarTemplate = async (perfil: string) => {
    if (!usuario) return;
    setBusy('template');
    const { error } = await onAplicarTemplate(usuario.id, perfil);
    setBusy(null);
    if (error) flash('err', error);
    else flash('ok', `Permissões do perfil "${perfil}" aplicadas para ${usuario.nome}.`);
  };

  if (!usuario) {
    return (
      <Card padding="md">
        <p className="text-sm text-content-muted">Nenhum usuário selecionado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="md">
        <CardHeader
          title="Matriz de permissões por módulo"
          subtitle="Marque as ações permitidas para o usuário selecionado em cada módulo."
          action={
            <div className="flex items-center gap-2">
              <Select
                value={usuario.id}
                onChange={(v) => setSelectedId(v as string)}
                options={usuarios.map((u) => ({ label: `${u.nome} — ${u.perfil}`, value: u.id }))}
                className="w-64"
                ariaLabel="Selecionar usuário"
              />
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-page border border-border-subtle">
          <Sparkles size={15} className="text-accent shrink-0" />
          <span className="text-xs text-content-muted">Aplicar template do perfil:</span>
          <div className="flex flex-wrap gap-1.5">
            {PERFIS.map((p) => (
              <button
                key={p}
                onClick={() => aplicarTemplate(p)}
                disabled={busy === 'template'}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-all',
                  usuario.perfil === p
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border-subtle text-content-muted hover:text-content hover:border-content-muted/40',
                  busy === 'template' && 'opacity-50 pointer-events-none',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          {busy === 'template' && <span className="text-xs text-content-muted">aplicando…</span>}
        </div>

        {msg && (
          <div className={cn(
            'mb-4 flex items-center gap-2 text-xs rounded-lg p-2.5 border',
            msg.tipo === 'ok' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger',
          )}>
            {msg.tipo === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{msg.texto}</span>
          </div>
        )}

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted py-2 pr-4 sticky left-0 bg-surface">Módulo</th>
                {COLUNAS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <th key={c.key} className="text-center py-2 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <Icon size={14} className={c.cor} />
                        <span className="text-xs font-medium text-content-muted">{c.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((grupo) => {
                const mods = MODULOS_ACESSO.filter((m) => m.grupo === grupo);
                return (
                  <FragmentGrupo key={grupo} grupo={grupo} mods={mods} usuario={usuario} acessos={acessos} onToggle={toggle} busy={busy} />
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FragmentGrupo({
  grupo, mods, usuario, acessos, onToggle, busy,
}: {
  grupo: string;
  mods: typeof MODULOS_ACESSO;
  usuario: Usuario;
  acessos: ModuloAcesso[];
  onToggle: (moduloId: string, col: PermissaoCol) => void;
  busy: string | null;
}) {
  return (
    <>
      <tr>
        <td colSpan={5} className="pt-4 pb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted/70">{grupo}</span>
          <div className="h-px bg-border-subtle mt-1.5" />
        </td>
      </tr>
      {mods.map((mod) => {
        const acc = acessosDoUsuario(acessos, usuario.id, mod.id);
        const isAdmin = usuario.perfil === 'Administrador';
        return (
          <tr key={mod.id} className="group">
            <td className="py-2 pr-4 text-content font-medium sticky left-0 bg-surface">{mod.label}</td>
            {COLUNAS.map((col) => {
              const valor = isAdmin ? true : (acc?.[col.key] ?? false);
              const isBusy = busy === `${mod.id}:${col.key}`;
              return (
                <td key={col.key} className="text-center py-2 px-2">
                  <button
                    onClick={() => onToggle(mod.id, col)}
                    disabled={isBusy || isAdmin}
                    title={isAdmin ? 'Administrador tem acesso total' : valor ? `Remover permissão de ${col.label}` : `Conceder permissão de ${col.label}`}
                    className={cn(
                      'h-8 w-8 rounded-lg grid place-items-center mx-auto transition-all',
                      valor
                        ? col.key === 'pode_administrar'
                          ? 'bg-danger/15 text-danger'
                          : col.key === 'pode_exportar'
                            ? 'bg-warning/15 text-warning'
                            : col.key === 'pode_editar'
                              ? 'bg-success/15 text-success'
                              : 'bg-info/15 text-info'
                        : 'bg-page text-content-muted/40 hover:text-content-muted hover:bg-surface-hover border border-border-subtle',
                      isBusy && 'opacity-50',
                      isAdmin && 'cursor-not-allowed',
                    )}
                  >
                    {isBusy ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : valor ? <Check size={15} /> : <Lock size={13} />}
                  </button>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
