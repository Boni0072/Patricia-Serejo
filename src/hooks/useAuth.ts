import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { fetchUsuarioPorEmail, criarUsuario, registrarUltimoAcesso } from '../lib/usuariosFirestore';
import type { Perfil } from '../types/usuarios';

export type { Perfil };

export interface AuthUser {
  id: string;
  email: string | null;
  nome: string | null;
  perfil: Perfil;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
}

async function firebaseUserToAuthUser(u: User): Promise<AuthUser> {
  const perfilDoc = await fetchUsuarioPorEmail(u.email ?? '');
  return {
    id: perfilDoc?.id ?? u.uid,
    email: u.email,
    nome: perfilDoc?.nome ?? u.displayName,
    perfil: perfilDoc?.perfil ?? 'Diretoria',
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null, loading: true, error: null, demo: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const authUser = await firebaseUserToAuthUser(fbUser);
          setState({ user: authUser, loading: false, error: null, demo: false });
          // registrar último acesso em background (não bloqueia o login)
          const perfilDoc = await fetchUsuarioPorEmail(fbUser.email ?? '');
          if (perfilDoc) registrarUltimoAcesso(perfilDoc.id);
        } catch {
          setState({ user: null, loading: false, error: null, demo: false });
        }
      } else {
        setState({ user: null, loading: false, error: null, demo: false });
      }
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      const msg = traduzErro(code);
      setState((s) => ({ ...s, loading: false, error: msg }));
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, nome: string, perfil: Perfil) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nome });
      // vincular perfil no Firestore ao uid do Firebase. Se já existir
      // documento para o e-mail (ex.: demo pré-criado), apenas vincula;
      // caso contrário cria um novo.
      const existing = await fetchUsuarioPorEmail(email);
      if (existing) {
        await updateDoc(doc(db, 'usuarios', existing.id), {
          firebase_uid: cred.user.uid,
          nome,
          perfil,
          atualizado_em: serverTimestamp(),
        });
      } else {
        const { id } = await criarUsuario({
          nome,
          email: email.toLowerCase(),
          perfil,
          cargo: null,
          telefone: null,
          status: 'ativo',
        });
        if (id) {
          await updateDoc(doc(db, 'usuarios', id), { firebase_uid: cred.user.uid });
        }
      }
      return { error: null };
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      const msg = traduzErro(code);
      setState((s) => ({ ...s, loading: false, error: msg }));
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setState({ user: null, loading: false, error: null, demo: false });
  }, []);

  const demoSignIn = useCallback(() => {
    const demoUser: AuthUser = {
      id: 'demo-user',
      email: 'demo@controladoria.com',
      nome: 'Usuário Demo',
      perfil: 'Diretoria',
    };
    setState({ user: demoUser, loading: false, error: null, demo: true });
  }, []);

  return { ...state, signIn, signUp, signOut, demoSignIn };
}

function traduzErro(code: string): string {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'E-mail ou senha inválidos.';
  if (code.includes('email-already-in-use')) return 'Este e-mail já está cadastrado.';
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns segundos e tente novamente.';
  if (code.includes('weak-password')) return 'A senha deve ter ao menos 6 caracteres.';
  if (code.includes('invalid-email')) return 'E-mail inválido.';
  if (code.includes('network')) return 'Falha de rede. Verifique sua conexão.';
  return code;
}

// Garante que exista um documento de perfil demo no Firestore. Idempotente.
export async function garantirUsuarioDemo(): Promise<void> {
  const demoEmail = 'demo@controladoria.com';
  const existing = await fetchUsuarioPorEmail(demoEmail);
  if (existing) return;
  await setDoc(doc(db, 'usuarios', 'demo-user'), {
    firebase_uid: 'demo-user',
    nome: 'Usuário Demo',
    email: demoEmail,
    perfil: 'Diretoria',
    cargo: 'Demonstração',
    telefone: null,
    foto_url: null,
    status: 'ativo',
    ultimo_acesso: null,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  });
}
