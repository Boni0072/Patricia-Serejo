import { useCallback, useEffect, useState } from 'react';
import * as fs from '../lib/usuariosFirestore';
import type { Usuario, ModuloAcesso, UsuarioInput } from '../types/usuarios';
import type { Perfil } from '../types/usuarios';

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [acessos, setAcessos] = useState<ModuloAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = fs.subscribeUsuarios(
      (users, acc) => {
        setUsuarios(users);
        setAcessos(acc);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    const unsub = fs.subscribeUsuarios(
      (users, acc) => {
        setUsuarios(users);
        setAcessos(acc);
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
    );
    return unsub;
  }, []);

  const criarUsuario = useCallback(async (input: UsuarioInput) => fs.criarUsuario(input), []);
  const criarUsuarioComAuth = useCallback(async (input: UsuarioInput, senha: string) =>
    fs.criarUsuarioComAuth(input, senha), []);
  const redefinirSenha = useCallback(async (email: string) => fs.redefinirSenha(email), []);
  const atualizarSenha = useCallback(async (email: string, novaSenha: string) =>
    fs.atualizarSenha(email, novaSenha), []);
  const atualizarUsuario = useCallback(async (id: string, input: Partial<UsuarioInput>) => fs.atualizarUsuario(id, input), []);
  const removerUsuario = useCallback(async (id: string) => fs.removerUsuario(id), []);

  const upsertAcesso = useCallback(async (
    acesso: Partial<ModuloAcesso> & { usuario_id: string; modulo_id: string },
  ) => fs.upsertAcesso(
    acesso.usuario_id,
    acesso.modulo_id,
    {
      pode_visualizar: acesso.pode_visualizar ?? false,
      pode_editar: acesso.pode_editar ?? false,
      pode_exportar: acesso.pode_exportar ?? false,
      pode_administrar: acesso.pode_administrar ?? false,
    },
  ), []);

  const aplicarTemplatePerfil = useCallback(async (usuarioId: string, perfil: string) =>
    fs.aplicarTemplatePerfilCmd(usuarioId, perfil as Perfil), []);

  return {
    usuarios, acessos, loading, error, reload,
    criarUsuario, criarUsuarioComAuth, redefinirSenha, atualizarSenha,
    atualizarUsuario, removerUsuario, upsertAcesso, aplicarTemplatePerfil,
  };
}

export { fs as usuariosFs };
export { acessosDoUsuario, modulosVisiveis } from '../lib/usuariosFirestore';
