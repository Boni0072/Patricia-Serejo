import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import * as db from '../lib/db';
import type { Perfil, Papel } from '../types/database';

interface AuthContextValue {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<{ error: string | null; papel: Papel | null }>;
  signUp: (dados: SignUpDados) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshPerfil: () => Promise<void>;
}

interface SignUpDados {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  cpf: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(async (uid: string) => {
    const p = await db.cliente.getPerfil(uid);
    setPerfil(p);
  }, []);

  const refreshPerfil = useCallback(async () => {
    if (user) await carregarPerfil(user.uid);
  }, [user, carregarPerfil]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await carregarPerfil(u.uid);
        } catch (e) {
          console.error('Erro ao carregar perfil:', e);
          setPerfil(null);
        } finally {
          setLoading(false);
        }
      } else {
        setPerfil(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [carregarPerfil]);

  const registrarLogAcesso = useCallback(async (acao: string, u?: User | null) => {
    const alvo = u ?? user;
    if (!alvo) return;
    await db.cliente.createLogAcesso({
      user_id: alvo.uid,
      email: alvo.email ?? null,
      papel: perfil?.papel ?? null,
      ip: null,
      acao,
    });
  }, [user, perfil]);

  const signIn = useCallback(async (email: string, senha: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const p = await db.cliente.getPerfil(cred.user.uid);
      setPerfil(p);
      (async () => { await registrarLogAcesso('login', cred.user); })();
      return { error: null, papel: p?.papel ?? null };
    } catch (e) {
      return { error: traduzErroAuth(e) };
    }
  }, [carregarPerfil, registrarLogAcesso]);

  const signUp = useCallback(async (dados: SignUpDados) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, dados.email, dados.senha);
      const uid = cred.user.uid;
      await db.createPerfil(uid, {
        nome: dados.nome,
        email: dados.email,
        papel: 'cliente' as Papel,
        telefone: dados.telefone,
        cpf: dados.cpf,
      });
      (async () => {
        await db.cliente.createConsentimentoLgpd(uid);
        await registrarLogAcesso('cadastro', cred.user);
      })();
      return { error: null };
    } catch (e) {
      return { error: traduzErroAuth(e) };
    }
  }, [registrarLogAcesso]);

  const signOut = useCallback(async () => {
    if (user) await registrarLogAcesso('logout', user);
    await fbSignOut(auth);
    setPerfil(null);
    setUser(null);
  }, [user, registrarLogAcesso]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/redefinir-senha`,
        handleCodeInApp: true,
      });
      return { error: null };
    } catch (e) {
      return { error: traduzErroAuth(e) };
    }
  }, []);

  const value: AuthContextValue = {
    user,
    perfil,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

function traduzErroAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = ((e as Error)?.message ?? '').toLowerCase();
  const c = code.toLowerCase();

  if (c.includes('email-already-in-use') || msg.includes('email-already-in-use'))
    return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci a senha".';
  if (c.includes('email-exists') || msg.includes('email-exists'))
    return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci a senha".';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'E-mail ou senha incorretos.';
  if (c.includes('weak-password') || msg.includes('password should be at least'))
    return 'A senha deve ter ao menos 6 caracteres.';
  if (c.includes('invalid-email') || msg.includes('invalid-email'))
    return 'E-mail inválido.';
  if (c.includes('operation-not-allowed') || msg.includes('operation-not-allowed'))
    return 'O cadastro por e-mail/senha não está habilitado. Contate o administrador.';
  if (c.includes('too-many-requests') || c.includes('rate') || msg.includes('too-many-requests'))
    return 'Muitas tentativas. Aguarde alguns minutos.';
  if (c.includes('network-request-failed') || msg.includes('network'))
    return 'Falha de conexão. Verifique sua internet e tente novamente.';

  if (import.meta.env.DEV) {
    console.error('Erro Auth não tratado:', e);
  }
  return 'Ocorreu um erro. Tente novamente.';
}
