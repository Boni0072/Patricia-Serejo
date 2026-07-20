import {
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { authAdmin, db } from './firebaseClient';
import { createPerfil, findClienteByEmail, updateCliente } from './db';
import type { Papel } from '../types/database';

export interface CriarContaClienteParams {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

export function codErroAuth(e: unknown): string {
  const code = ((e as { code?: string })?.code ?? '').toLowerCase();
  const msg = ((e as Error)?.message ?? '').toLowerCase();
  if (code.includes('email-already-in-use') || code.includes('email-exists') || msg.includes('email-already-in-use') || msg.includes('email-exists'))
    return 'email-em-uso';
  if (code.includes('weak-password') || msg.includes('password should be at least'))
    return 'senha-fraca';
  if (code.includes('invalid-email') || msg.includes('invalid-email'))
    return 'email-invalido';
  if (code.includes('operation-not-allowed') || msg.includes('operation-not-allowed'))
    return 'operacao-bloqueada';
  if (code.includes('too-many-requests') || code.includes('rate'))
    return 'muitas-tentativas';
  if (code.includes('network-request-failed') || msg.includes('network'))
    return 'rede';
  return 'desconhecido';
}

function gerarSenhaTemporaria(tamanho = 24): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const arr = new Uint32Array(tamanho);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

export async function criarContaCliente(params: CriarContaClienteParams): Promise<string> {
  const senhaTemp = gerarSenhaTemporaria();

  const cred = await createUserWithEmailAndPassword(authAdmin, params.email, senhaTemp);
  const uid = cred.user.uid;

  await createPerfil(uid, {
    nome: params.nome,
    email: params.email,
    papel: 'cliente' as Papel,
    telefone: params.telefone,
    cpf: params.cpf,
  });

  const clienteExistente = await findClienteByEmail(params.email);
  if (clienteExistente) {
    await updateCliente(clienteExistente.id, { user_id: uid });
  }

  await sendPasswordResetEmail(authAdmin, params.email, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  });

  await signOut(authAdmin);
  return uid;
}

export async function reenviarAcessoCliente(email: string): Promise<void> {
  await sendPasswordResetEmail(authAdmin, email, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  });
}

/* ============================================================
 * ADVOGADOS — criados pelo admin no painel administrativo.
 * Fluxo igual ao do cliente: cria usuário na instância admin,
 * grava perfil com papel 'advogado', envia e-mail para definir
 * senha e encerra a sessão admin temporária.
 * ============================================================ */
export interface CriarContaAdvogadoParams {
  nome: string;
  email: string;
  telefone: string;
}

export async function criarContaAdvogado(params: CriarContaAdvogadoParams): Promise<string> {
  const senhaTemp = gerarSenhaTemporaria();

  const cred = await createUserWithEmailAndPassword(authAdmin, params.email, senhaTemp);
  const uid = cred.user.uid;

  await createPerfil(uid, {
    nome: params.nome,
    email: params.email,
    papel: 'advogado' as Papel,
    telefone: params.telefone,
    cpf: null,
  });

  await sendPasswordResetEmail(authAdmin, params.email, {
    url: `${window.location.origin}/login?area=admin`,
    handleCodeInApp: false,
  });

  await signOut(authAdmin);
  return uid;
}

export async function reenviarAcessoAdvogado(email: string): Promise<void> {
  await sendPasswordResetEmail(authAdmin, email, {
    url: `${window.location.origin}/login?area=admin`,
    handleCodeInApp: false,
  });
}

/* ============================================================
 * SETUP — criação do primeiro administrador (bootstrap).
 * A tela /setup só permite prosseguir se ainda não existir
 * nenhum perfil com papel 'admin' no banco.
 * ============================================================ */
export async function existeAdmin(): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'perfis'), where('papel', '==', 'admin'), limit(1)));
  return !snap.empty;
}

export async function criarAdminInicial(params: {
  nome: string;
  email: string;
  senha: string;
}): Promise<void> {
  const cred = await createUserWithEmailAndPassword(authAdmin, params.email, params.senha);
  const uid = cred.user.uid;

  await setDoc(doc(db, 'perfis', uid), {
    nome: params.nome,
    email: params.email,
    papel: 'admin' as Papel,
    telefone: null,
    cpf: null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });

  await signOut(authAdmin);
}
