import { useEffect, useMemo, useState } from 'react';
import {
  Users, UserPlus, Search, Shield, UserCog, MoreVertical, Trash2, Pencil,
  Check, X, Loader2, AlertCircle, LayoutGrid,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Select } from '../components/ui/Select';
import { UserFormModal } from '../components/UserFormModal';
import { PermissionsMatrix } from '../components/PermissionsMatrix';
import { PageAccessSection } from '../components/PageAccessSection';
import { ProfileTab } from '../components/ProfileTab';
import { useUsuarios, modulosVisiveis } from '../hooks/useUsuarios';
import { seedDemoSeVazio } from '../lib/usuariosFirestore';
import { useAuth } from '../hooks/useAuth';
import {
  PERFIS, STATUS_LABEL,
  MODULOS_ACESSO, type Usuario, type UsuarioInput, type UsuarioStatus,
} from '../types/usuarios';
import { formatDate } from '../lib/format';

export function UsuariosPage() {
  const {
    usuarios, acessos, loading, error, reload,
    criarUsuario, criarUsuarioComAuth, redefinirSenha, atualizarSenha,
    atualizarUsuario, removerUsuario, upsertAcesso, aplicarTemplatePerfil,
  } = useUsuarios();
  const { user, signOut } = useAuth();

  useEffect(() => {
    seedDemoSeVazio().catch(() => { /* falha de seed não bloqueia a tela */ });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string | undefined>(undefined);
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>(undefined);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  // usuário atual (do Firebase auth) mapeado para o registro de usuarios
  const usuarioAtual = useMemo(() => {
    if (!user) return null;
    return usuarios.find((u) => u.email.toLowerCase() === (user.email ?? '').toLowerCase()) ?? usuarios[0] ?? null;
  }, [usuarios, user]);

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca = !busca ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase()) ||
        (u.cargo ?? '').toLowerCase().includes(busca.toLowerCase());
      const matchPerfil = !filtroPerfil || u.perfil === filtroPerfil;
      const matchStatus = !filtroStatus || u.status === filtroStatus;
      return matchBusca && matchPerfil && matchStatus;
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  const stats = useMemo(() => {
    const ativos = usuarios.filter((u) => u.status === 'ativo').length;
    const admins = usuarios.filter((u) => u.perfil === 'Administrador').length;
    const suspensos = usuarios.filter((u) => u.status === 'suspenso').length;
    return { total: usuarios.length, ativos, admins, suspensos };
  }, [usuarios]);

  const abrirNovo = () => { setEditing(null); setModalOpen(true); };
  const abrirEdicao = (u: Usuario) => { setEditing(u); setModalOpen(true); setMenuOpenId(null); };

  const handleSave = async (input: UsuarioInput, id?: string, senha?: string): Promise<{ error: string | null; id?: string }> => {
    if (id) {
      const err = await atualizarUsuario(id, input);
      return { error: err.error, id };
    }
    if (senha) {
      const r = await criarUsuarioComAuth(input, senha);
      return { error: r.error, id: r.id };
    }
    const r = await criarUsuario(input);
    return { error: r.error, id: r.id };
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await removerUsuario(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
  };

  const statusTone = (s: UsuarioStatus) => s === 'ativo' ? 'success' : s === 'suspenso' ? 'danger' : 'neutral';
  const perfilTone = (p: string) => p === 'Administrador' ? 'danger' : p === 'Diretoria' ? 'info' : 'neutral';

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Usuários e Acessos"
        subtitle="Gerencie usuários, configure perfis e defina permissões granulares por módulo."
        actions={
          <Button variant="primary" leftIcon={<UserPlus size={15} />} onClick={abrirNovo}>
            Novo usuário
          </Button>
        }
        onRefresh={reload}
        refreshing={loading}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total de usuários" value={stats.total} icon={Users} cor="text-info" />
        <StatCard label="Ativos" value={stats.ativos} icon={Check} cor="text-success" />
        <StatCard label="Administradores" value={stats.admins} icon={Shield} cor="text-danger" />
        <StatCard label="Suspensos" value={stats.suspensos} icon={X} cor="text-warning" />
      </div>

      <Tabs
        tabs={[
          {
            id: 'lista',
            label: <span className="flex items-center gap-1.5"><Users size={13} /> Usuários</span>,
            content: (
              <div className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                    <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou cargo…" className="pl-9" />
                  </div>
                  <Select
                    value={filtroPerfil}
                    onChange={(v) => setFiltroPerfil(v)}
                    options={PERFIS.map((p) => ({ label: p, value: p }))}
                    placeholder="Todos os perfis"
                    clearable
                    className="sm:w-48"
                  />
                  <Select
                    value={filtroStatus}
                    onChange={(v) => setFiltroStatus(v)}
                    options={(['ativo', 'inativo', 'suspenso'] as UsuarioStatus[]).map((s) => ({ label: STATUS_LABEL[s], value: s }))}
                    placeholder="Todos os status"
                    clearable
                    className="sm:w-40"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Tabela / lista */}
                <Card padding="none" className="overflow-hidden">
                  {loading ? (
                    <div className="p-10 grid place-items-center">
                      <Loader2 size={24} className="animate-spin text-content-muted" />
                      <p className="text-xs text-content-muted mt-2">Carregando usuários…</p>
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="p-10 text-center">
                      <Users size={28} className="mx-auto text-content-muted/50" />
                      <p className="text-sm text-content-muted mt-2">Nenhum usuário encontrado.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-subtle">
                              <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted px-4 py-3">Usuário</th>
                              <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted px-4 py-3">Perfil</th>
                              <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted px-4 py-3">Status</th>
                              <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted px-4 py-3">Módulos</th>
                              <th className="text-left text-xs font-medium uppercase tracking-wide text-content-muted px-4 py-3">Último acesso</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtrados.map((u) => {
                              const visiveis = modulosVisiveis(acessos, u.id);
                              const iniciais = u.nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
                              return (
                                <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent/80 to-accent-hover/80 grid place-items-center text-page font-semibold text-xs shrink-0">
                                        {iniciais || 'U'}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-content truncate">{u.nome}</p>
                                        <p className="text-xs text-content-muted truncate">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3"><Badge tone={perfilTone(u.perfil)}>{u.perfil}</Badge></td>
                                  <td className="px-4 py-3"><Badge tone={statusTone(u.status)} dot>{STATUS_LABEL[u.status]}</Badge></td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-content-muted">{visiveis.length} de {MODULOS_ACESSO.length}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-content-muted">{u.ultimo_acesso ? formatDate(u.ultimo_acesso) : '—'}</td>
                                  <td className="px-4 py-3 text-right relative">
                                    <button
                                      onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                                      className="h-8 w-8 grid place-items-center rounded-lg text-content-muted hover:text-content hover:bg-surface-hover"
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                    {menuOpenId === u.id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                        <div className="absolute right-4 top-12 z-20 w-44 rounded-lg bg-surface border border-border-subtle shadow-card-hover py-1 animate-scale-in origin-top">
                                          <button onClick={() => abrirEdicao(u)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-content hover:bg-surface-hover text-left">
                                            <Pencil size={14} /> Editar
                                          </button>
                                          <button onClick={() => { setConfirmDelete(u); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 text-left">
                                            <Trash2 size={14} /> Excluir
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden divide-y divide-border-subtle">
                        {filtrados.map((u) => {
                          const iniciais = u.nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
                          const visiveis = modulosVisiveis(acessos, u.id);
                          return (
                            <div key={u.id} className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/80 to-accent-hover/80 grid place-items-center text-page font-semibold text-xs shrink-0">
                                  {iniciais || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-content truncate">{u.nome}</p>
                                  <p className="text-xs text-content-muted truncate">{u.email}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <Badge tone={perfilTone(u.perfil)}>{u.perfil}</Badge>
                                    <Badge tone={statusTone(u.status)} dot>{STATUS_LABEL[u.status]}</Badge>
                                  </div>
                                  <p className="text-xs text-content-muted mt-2">{visiveis.length} módulos acessíveis</p>
                                </div>
                                <button onClick={() => abrirEdicao(u)} className="h-8 w-8 grid place-items-center rounded-lg text-content-muted hover:text-content hover:bg-surface-hover">
                                  <Pencil size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: 'permissoes',
            label: <span className="flex items-center gap-1.5"><Shield size={13} /> Permissões</span>,
            content: (
              <PermissionsMatrix
                usuarios={usuarios}
                acessos={acessos}
                onAplicarTemplate={aplicarTemplatePerfil}
                onUpsertAcesso={upsertAcesso}
              />
            ),
          },
          {
            id: 'acesso-paginas',
            label: <span className="flex items-center gap-1.5"><LayoutGrid size={13} /> Acesso às Páginas</span>,
            content: (
              <PageAccessSection
                usuarios={usuarios}
                acessos={acessos}
                onUpsertAcesso={upsertAcesso}
                onAplicarTemplate={aplicarTemplatePerfil}
              />
            ),
          },
          {
            id: 'perfil',
            label: <span className="flex items-center gap-1.5"><UserCog size={13} /> Meu Perfil</span>,
            content: <ProfileTab usuario={usuarioAtual} onUpdate={atualizarUsuario} onSignOut={signOut} />,
          },
        ]}
      />

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        usuario={editing}
        acessos={acessos}
        onUpsertAcesso={upsertAcesso}
        onSave={handleSave}
        onResetSenha={redefinirSenha}
        onAtualizarSenha={atualizarSenha}
      />

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <motion.div
            className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-5"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-danger/15 grid place-items-center">
                <Trash2 size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-content">Excluir usuário</h3>
                <p className="text-xs text-content-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-content-muted">
              Tem certeza que deseja excluir <span className="font-medium text-content">{confirmDelete.nome}</span>? Todas as permissões associadas também serão removidas.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" leftIcon={deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo…' : 'Excluir'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, cor }: { label: string; value: number; icon: typeof Users; cor: string }) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-content-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-content mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-surface-hover grid place-items-center">
          <Icon size={18} className={cor} />
        </div>
      </div>
    </Card>
  );
}
