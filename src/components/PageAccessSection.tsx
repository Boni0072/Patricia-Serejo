import { useMemo, useState } from 'react';
import { Check, Lock, Eye, EyeOff, LayoutGrid, Sparkles, AlertCircle, Shield } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Select } from './ui/Select';
import { cn } from '../lib/format';
import { NAV_ITEMS } from './Sidebar';
import { MODULOS_ACESSO, PERFIS } from '../types/usuarios';
import { acessosDoUsuario } from '../hooks/useUsuarios';
import type { Usuario, ModuloAcesso } from '../types/usuarios';

interface Props {
  usuarios: Usuario[];
  acessos: ModuloAcesso[];
  onUpsertAcesso: (acesso: Partial<ModuloAcesso> & { usuario_id: string; modulo_id: string }) => Promise<{ error: string | null }>;
  onAplicarTemplate: (usuarioId: string, perfil: string) => Promise<{ error: string | null }>;
}

const GRUPO_LABEL: Record<string, string> = {
  Executivo: 'Executivo',
  Financeiro: 'Financeiro',
  Operacional: 'Operacional',
  Sistema: 'Sistema',
};

const GRUPO_ORDEM = ['Executivo', 'Financeiro', 'Operacional', 'Sistema'];

export function PageAccessSection({ usuarios, acessos, onUpsertAcesso, onAplicarTemplate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(usuarios[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');

  const usuario = useMemo(() => usuarios.find((u) => u.id === selectedId) ?? null, [usuarios, selectedId]);
  const isAdmin = usuario?.perfil === 'Administrador';

  const iconById = useMemo(() => {
    const map: Record<string, typeof Eye> = {};
    NAV_ITEMS.forEach((n) => { map[n.id] = n.icon; });
    return map;
  }, []);

  const flash = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2400);
  };

  const toggleAcesso = async (moduloId: string) => {
    if (!usuario || isAdmin) return;
    const atual = acessosDoUsuario(acessos, usuario.id, moduloId);
    const novoValor = !(atual?.pode_visualizar ?? false);
    setBusy(moduloId);
    const { error } = await onUpsertAcesso({
      usuario_id: usuario.id,
      modulo_id: moduloId,
      pode_visualizar: novoValor,
      pode_editar: atual?.pode_editar ?? false,
      pode_exportar: atual?.pode_exportar ?? false,
      pode_administrar: atual?.pode_administrar ?? false,
    });
    setBusy(null);
    if (error) flash('err', error);
  };

  const marcarGrupo = async (grupo: string, valor: boolean) => {
    if (!usuario || isAdmin) return;
    const mods = MODULOS_ACESSO.filter((m) => m.grupo === grupo);
    setBusy(`grupo:${grupo}`);
    for (const m of mods) {
      const atual = acessosDoUsuario(acessos, usuario.id, m.id);
      if ((atual?.pode_visualizar ?? false) === valor) continue;
      await onUpsertAcesso({
        usuario_id: usuario.id,
        modulo_id: m.id,
        pode_visualizar: valor,
        pode_editar: atual?.pode_editar ?? false,
        pode_exportar: atual?.pode_exportar ?? false,
        pode_administrar: atual?.pode_administrar ?? false,
      });
    }
    setBusy(null);
    flash('ok', `${valor ? 'Acesso concedido' : 'Acesso revogado'} para todo o grupo ${grupo}.`);
  };

  const aplicarTemplate = async (perfil: string) => {
    if (!usuario) return;
    setBusy('template');
    const { error } = await onAplicarTemplate(usuario.id, perfil);
    setBusy(null);
    if (error) flash('err', error);
    else flash('ok', `Perfil "${perfil}" aplicado para ${usuario.nome}.`);
  };

  if (!usuario) {
    return (
      <Card padding="md">
        <p className="text-sm text-content-muted">Nenhum usuário selecionado.</p>
      </Card>
    );
  }

  const gruposVisiveis = GRUPO_ORDEM.filter((g) => filtroGrupo === 'todos' || filtroGrupo === g);
  const totalConcedido = MODULOS_ACESSO.filter((m) => {
    if (isAdmin) return true;
    return acessosDoUsuario(acessos, usuario.id, m.id)?.pode_visualizar;
  }).length;

  return (
    <div className="space-y-4">
      <Card padding="md">
        <CardHeader
          title="Acesso às páginas"
          subtitle="Conceda ou revogue o acesso de visualização a cada página do sistema."
          action={
            <Select
              value={usuario.id}
              onChange={(v) => setSelectedId(v as string)}
              options={usuarios.map((u) => ({ label: `${u.nome} — ${u.perfil}`, value: u.id }))}
              className="w-64"
              ariaLabel="Selecionar usuário"
            />
          }
        />

        {/* Templates + resumo */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 p-3 rounded-lg bg-page border border-border-subtle">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles size={15} className="text-accent" />
            <span className="text-xs text-content-muted">Aplicar perfil:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 flex-1">
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
          <div className="flex items-center gap-2 shrink-0 pl-3 sm:border-l border-border-subtle">
            <span className="text-xs text-content-muted">Acesso:</span>
            <span className="text-xs font-semibold text-content">{totalConcedido}/{MODULOS_ACESSO.length}</span>
          </div>
        </div>

        {/* Filtro por grupo */}
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid size={14} className="text-content-muted" />
          {(['todos', ...GRUPO_ORDEM] as const).map((g) => (
            <button
              key={g}
              onClick={() => setFiltroGrupo(g)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md transition-all capitalize',
                filtroGrupo === g
                  ? 'bg-accent text-page font-medium'
                  : 'text-content-muted hover:text-content hover:bg-surface-hover',
              )}
            >
              {g === 'todos' ? 'Todos' : GRUPO_LABEL[g]}
            </button>
          ))}
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

        {isAdmin && (
          <div className="mb-4 flex items-center gap-2 text-xs rounded-lg p-2.5 bg-danger/10 border border-danger/20 text-danger">
            <Shield size={14} />
            <span>Administradores possuem acesso total a todas as páginas.</span>
          </div>
        )}

        {/* Grupos de páginas */}
        <div className="space-y-6">
          {gruposVisiveis.map((grupo) => {
            const mods = MODULOS_ACESSO.filter((m) => m.grupo === grupo);
            return (
              <div key={grupo}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted/70">{GRUPO_LABEL[grupo]}</span>
                    <div className="h-px w-8 bg-border-subtle" />
                  </div>
                  {!isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => marcarGrupo(grupo, true)}
                        disabled={busy === `grupo:${grupo}`}
                        className="text-[10px] px-2 py-0.5 rounded text-content-muted hover:text-success hover:bg-success/10 transition-colors"
                      >
                        Todos
                      </button>
                      <span className="text-content-muted/40">·</span>
                      <button
                        onClick={() => marcarGrupo(grupo, false)}
                        disabled={busy === `grupo:${grupo}`}
                        className="text-[10px] px-2 py-0.5 rounded text-content-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        Nenhum
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {mods.map((mod) => {
                    const acc = acessosDoUsuario(acessos, usuario.id, mod.id);
                    const on = isAdmin || (acc?.pode_visualizar ?? false);
                    const Icon = iconById[mod.id] ?? Eye;
                    const isBusy = busy === mod.id;
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleAcesso(mod.id)}
                        disabled={isBusy || isAdmin}
                        title={isAdmin ? 'Administrador tem acesso total' : on ? 'Revogar acesso' : 'Conceder acesso'}
                        className={cn(
                          'group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all',
                          on
                            ? 'border-accent/40 bg-accent/8 hover:bg-accent/12'
                            : 'border-border-subtle bg-surface hover:border-content-muted/40 hover:bg-surface-hover',
                          isAdmin && 'cursor-not-allowed opacity-90',
                          isBusy && 'opacity-50',
                        )}
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors',
                          on ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-content-muted/60',
                        )}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-medium truncate', on ? 'text-content' : 'text-content-muted')}>{mod.label}</p>
                          <p className="text-[10px] text-content-muted/70 mt-0.5">{on ? 'Acesso liberado' : 'Sem acesso'}</p>
                        </div>
                        <div className={cn(
                          'shrink-0 h-5 w-5 rounded-md grid place-items-center transition-all',
                          on ? 'bg-accent text-page' : 'bg-page border border-border-subtle text-content-muted/40',
                        )}>
                          {isBusy ? (
                            <span className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : on ? (
                            <Check size={13} />
                          ) : isAdmin ? (
                            <Lock size={11} />
                          ) : (
                            <EyeOff size={12} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
