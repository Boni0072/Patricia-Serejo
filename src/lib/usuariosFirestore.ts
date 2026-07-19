import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db, secondaryAuth } from './firebase';
import type { Perfil } from '../types/usuarios';
import {
  PERFIL_DESCRICOES, PERFIS, MODULOS_ACESSO,
  type Usuario, type ModuloAcesso, type UsuarioInput, type ModuloDefAcesso,
} from '../types/usuarios';

const COL_USUARIOS = 'usuarios';
const COL_ACESSOS = 'modulos_acesso';

export interface UsuarioDoc extends Omit<Usuario, 'id' | 'criado_em' | 'atualizado_em'> {
  criado_em?: unknown;
  atualizado_em?: unknown;
}

export interface ModuloAcessoDoc extends Omit<ModuloAcesso, 'id' | 'criado_em'> {
  criado_em?: unknown;
}

export function perfilDescricao(p: Perfil): string {
  return PERFIL_DESCRICOES[p] ?? '';
}

/** Listener em tempo real: usuarios + modulos_acesso. Retorna unsubscribe. */
export function subscribeUsuarios(
  onNext: (usuarios: Usuario[], acessos: ModuloAcesso[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let users: Usuario[] = [];
  let acessos: ModuloAcesso[] = [];
  let usersReady = false;
  let acessosReady = false;

  const emit = () => {
    if (usersReady && acessosReady) onNext(users, acessos);
  };

  const unsubUsers = onSnapshot(
    collection(db, COL_USUARIOS),
    (snap) => {
      users = snap.docs.map((d) => docToUsuario(d.id, d.data() as UsuarioDoc));
      users.sort((a, b) => a.nome.localeCompare(b.nome));
      usersReady = true;
      emit();
    },
    (err) => onError?.(err as Error),
  );

  const unsubAcessos = onSnapshot(
    collection(db, COL_ACESSOS),
    (snap) => {
      acessos = snap.docs.map((d) => docToAcesso(d.id, d.data() as ModuloAcessoDoc));
      acessosReady = true;
      emit();
    },
    (err) => onError?.(err as Error),
  );

  return () => { unsubUsers(); unsubAcessos(); };
}

export async function fetchUsuarioPorUid(uid: string): Promise<Usuario | null> {
  const q = query(collection(db, COL_USUARIOS), where('firebase_uid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToUsuario(d.id, d.data() as UsuarioDoc);
}

export async function fetchUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const q = query(collection(db, COL_USUARIOS), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToUsuario(d.id, d.data() as UsuarioDoc);
}

export async function criarUsuario(input: UsuarioInput): Promise<{ error: string | null; id?: string }> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const docData: UsuarioDoc = {
    ...input,
    email: input.email.toLowerCase(),
    ultimo_acesso: null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, COL_USUARIOS, id), docData);
    await seedPermissoesPadrao(id, input.perfil);
    return { error: null, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
    return { error: msg };
  }
}

/**
 * Cria a conta de autenticação no Firebase (via instância secundária, para
 * não deslogar o admin) e o documento de perfil no Firestore, vinculando o
 * firebase_uid. Se a conta de auth já existir, retorna erro amigável.
 */
export async function criarUsuarioComAuth(
  input: UsuarioInput,
  senha: string,
): Promise<{ error: string | null; id?: string }> {
  const email = input.email.toLowerCase();
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
    const uid = cred.user.uid;
    // desfaz o login automático na instância secundária
    await fbSignOut(secondaryAuth);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await setDoc(doc(db, COL_USUARIOS, id), {
      firebase_uid: uid,
      nome: input.nome,
      email,
      perfil: input.perfil,
      cargo: input.cargo ?? null,
      telefone: input.telefone ?? null,
      foto_url: null,
      status: input.status,
      ultimo_acesso: null,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp(),
    });
    await seedPermissoesPadrao(id, input.perfil);
    return { error: null, id };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { error: traduzErroAuth(raw) };
  }
}

/** Envia e-mail de redefinição de senha para o usuário. */
export async function redefinirSenha(email: string): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email.toLowerCase());
    return { error: null };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { error: traduzErroAuth(raw) };
  }
}

/**
 * Atualiza a senha de um usuário diretamente (sem e-mail de redefinição).
 * Usa a Edge Function `firebase-update-password` que chama a Identity Toolkit
 * API do Firebase com a web API key (valor público, já presente no cliente).
 */
export async function atualizarSenha(email: string, novaSenha: string): Promise<{ error: string | null }> {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ?? '';
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? '';
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firebase-update-password`;
  const headers = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiKey, projectId, email, novaSenha }),
    });
    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
    if (!res.ok || data.error) {
      return { error: data.error ?? `Falha ao atualizar senha (${res.status})` };
    }
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro de rede ao atualizar senha';
    return { error: msg };
  }
}

function traduzErroAuth(code: string): string {
  if (code.includes('email-already-in-use')) return 'Já existe uma conta de autenticação com este e-mail.';
  if (code.includes('weak-password')) return 'A senha deve ter ao menos 6 caracteres.';
  if (code.includes('invalid-email')) return 'E-mail inválido.';
  if (code.includes('operation-not-allowed')) return 'Criação de contas está desativada no Firebase.';
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns segundos.';
  if (code.includes('user-not-found')) return 'Nenhum usuário encontrado com este e-mail.';
  return code;
}

export async function atualizarUsuario(id: string, input: Partial<UsuarioInput>): Promise<{ error: string | null }> {
  try {
    const data: Record<string, unknown> = { ...input, atualizado_em: serverTimestamp() };
    if (input.email) data.email = input.email.toLowerCase();
    await updateDoc(doc(db, COL_USUARIOS, id), data);
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar usuário';
    return { error: msg };
  }
}

export async function removerUsuario(id: string): Promise<{ error: string | null }> {
  try {
    await deleteDoc(doc(db, COL_USUARIOS, id));
    const accQ = query(collection(db, COL_ACESSOS), where('usuario_id', '==', id));
    const accSnap = await getDocs(accQ);
    await Promise.all(accSnap.docs.map((d) => deleteDoc(d.ref)));
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover usuário';
    return { error: msg };
  }
}

export async function registrarUltimoAcesso(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COL_USUARIOS, id), {
      ultimo_acesso: serverTimestamp(),
      atualizado_em: serverTimestamp(),
    });
  } catch {
    /* não-fatal: login não deve falhar por isto */
  }
}

export async function upsertAcesso(
  usuarioId: string,
  moduloId: string,
  perms: { pode_visualizar: boolean; pode_editar: boolean; pode_exportar: boolean; pode_administrar: boolean },
  existingId?: string,
): Promise<{ error: string | null; id?: string }> {
  const accId = existingId ?? `${usuarioId}_${moduloId}`;
  try {
    await setDoc(doc(db, COL_ACESSOS, accId), {
      usuario_id: usuarioId,
      modulo_id: moduloId,
      pode_visualizar: perms.pode_visualizar,
      pode_editar: perms.pode_editar,
      pode_exportar: perms.pode_exportar,
      pode_administrar: perms.pode_administrar,
      criado_em: serverTimestamp(),
    }, { merge: true });
    return { error: null, id: accId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao salvar permissão';
    return { error: msg };
  }
}

export async function aplicarTemplatePerfilCmd(usuarioId: string, perfil: Perfil): Promise<{ error: string | null }> {
  await seedPermissoesPadrao(usuarioId, perfil, true);
  return { error: null };
}

export async function seedPermissoesPadrao(usuarioId: string, perfil: Perfil, replace = false): Promise<void> {
  if (replace) {
    const q = query(collection(db, COL_ACESSOS), where('usuario_id', '==', usuarioId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  const tpl = templatePorPerfil(perfil);
  const promises = MODULOS_ACESSO.map((m) =>
    setDoc(doc(db, COL_ACESSOS, `${usuarioId}_${m.id}`), {
      usuario_id: usuarioId,
      modulo_id: m.id,
      pode_visualizar: tpl.visualizar.includes(m.id),
      pode_editar: tpl.editar.includes(m.id),
      pode_exportar: tpl.exportar.includes(m.id),
      pode_administrar: tpl.administrar.includes(m.id),
      criado_em: serverTimestamp(),
    }, { merge: true }),
  );
  await Promise.all(promises);
}

function templatePorPerfil(perfil: Perfil): {
  visualizar: string[]; editar: string[]; exportar: string[]; administrar: string[];
} {
  const todos = MODULOS_ACESSO.map((m) => m.id);
  switch (perfil) {
    case 'Administrador':
      return { visualizar: todos, editar: todos, exportar: todos, administrar: todos };
    case 'Diretoria':
      return { visualizar: todos, editar: [], exportar: todos, administrar: [] };
    case 'Controladoria': {
      const c = ['dashboard','controladoria','budget','indicadores','resultado','ebitda','lancamentos','alertas','fontes'];
      return { visualizar: c, editar: c, exportar: c, administrar: [] };
    }
    case 'Contabilidade': {
      const ct = ['dashboard','lancamentos','controladoria','alertas'];
      return { visualizar: ct, editar: ct, exportar: [], administrar: [] };
    }
    case 'Financeiro': {
      const f = ['dashboard','financeiro','fluxo-caixa','lancamentos','alertas'];
      return { visualizar: f, editar: f, exportar: f, administrar: [] };
    }
    case 'Compras': {
      const cp = ['dashboard','compras','estoque','alertas'];
      return { visualizar: cp, editar: cp, exportar: [], administrar: [] };
    }
    default:
      return { visualizar: ['dashboard'], editar: [], exportar: [], administrar: [] };
  }
}

export function acessosDoUsuario(acessos: ModuloAcesso[], usuarioId: string, moduloId: string): ModuloAcesso | undefined {
  return acessos.find((a) => a.usuario_id === usuarioId && a.modulo_id === moduloId);
}

export function modulosVisiveis(acessos: ModuloAcesso[], usuarioId: string): ModuloDefAcesso[] {
  const visiveis = acessos.filter((a) => a.usuario_id === usuarioId && a.pode_visualizar).map((a) => a.modulo_id);
  return MODULOS_ACESSO.filter((m) => visiveis.includes(m.id));
}

function docToUsuario(id: string, d: UsuarioDoc): Usuario {
  const ts = (v: unknown): string | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object' && v && 'seconds' in v) {
      const s = (v as { seconds: number; nanoseconds?: number }).seconds;
      return new Date(s * 1000).toISOString();
    }
    if (typeof v === 'string') return v;
    return undefined;
  };
  return {
    id,
    firebase_uid: d.firebase_uid ?? null,
    nome: d.nome ?? '',
    email: d.email ?? '',
    perfil: (d.perfil as Perfil) ?? 'Diretoria',
    cargo: d.cargo ?? null,
    telefone: d.telefone ?? null,
    foto_url: d.foto_url ?? null,
    status: d.status ?? 'ativo',
    ultimo_acesso: ts(d.ultimo_acesso) ?? null,
    criado_em: ts(d.criado_em) ?? new Date().toISOString(),
    atualizado_em: ts(d.atualizado_em) ?? new Date().toISOString(),
  };
}

function docToAcesso(id: string, d: ModuloAcessoDoc): ModuloAcesso {
  return {
    id,
    usuario_id: d.usuario_id,
    modulo_id: d.modulo_id,
    pode_visualizar: d.pode_visualizar ?? false,
    pode_editar: d.pode_editar ?? false,
    pode_exportar: d.pode_exportar ?? false,
    pode_administrar: d.pode_administrar ?? false,
  };
}

export { PERFIS };

/** Popula usuários e permissões demo se a coleção estiver vazia. Idempotente. */
export async function seedDemoSeVazio(): Promise<void> {
  const snap = await getDocs(collection(db, COL_USUARIOS));
  if (!snap.empty) return;

  const demo: { nome: string; email: string; perfil: Perfil; cargo: string; telefone: string; status: 'ativo' | 'inativo' }[] = [
    { nome: 'Ana Souza', email: 'ana.souza@controladoria.com', perfil: 'Administrador', cargo: 'CFO', telefone: '+55 11 99888-1001', status: 'ativo' },
    { nome: 'Bruno Lima', email: 'bruno.lima@controladoria.com', perfil: 'Diretoria', cargo: 'Diretor Financeiro', telefone: '+55 11 99888-1002', status: 'ativo' },
    { nome: 'Carla Dias', email: 'carla.dias@controladoria.com', perfil: 'Controladoria', cargo: 'Controller', telefone: '+55 11 99888-1003', status: 'ativo' },
    { nome: 'Diego Martins', email: 'diego.martins@controladoria.com', perfil: 'Financeiro', cargo: 'Gerente Financeiro', telefone: '+55 11 99888-1004', status: 'ativo' },
    { nome: 'Eliane Costa', email: 'eliane.costa@controladoria.com', perfil: 'Contabilidade', cargo: 'Coordenadora Contábil', telefone: '+55 11 99888-1005', status: 'ativo' },
    { nome: 'Felipe Nunes', email: 'felipe.nunes@controladoria.com', perfil: 'Compras', cargo: 'Gerente de Compras', telefone: '+55 11 99888-1006', status: 'ativo' },
    { nome: 'Gisele Alves', email: 'gisele.alves@controladoria.com', perfil: 'Controladoria', cargo: 'Analista de Controladoria', telefone: '+55 11 99888-1007', status: 'ativo' },
    { nome: 'Hugo Ribeiro', email: 'hugo.ribeiro@controladoria.com', perfil: 'Financeiro', cargo: 'Analista Financeiro', telefone: '+55 11 99888-1008', status: 'inativo' },
  ];

  for (const u of demo) {
    const { id } = await criarUsuario({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      cargo: u.cargo,
      telefone: u.telefone,
      status: u.status,
    });
    if (id) await seedPermissoesPadrao(id, u.perfil);
  }
}
