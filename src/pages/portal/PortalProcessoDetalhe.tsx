import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Scale, FileText, Upload, Download, Send, Clock,
  Paperclip, AlertCircle, MessageSquare, Eye, Users, Plus,
  Pencil, Trash2, UserCheck,
} from 'lucide-react';
import * as db from '../../lib/db';
import {
  uploadDocumento,
  caminhoDocumentoUpload,
  baixarDocumentoURL,
} from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';
import VisualizadorDocumento from '../../components/VisualizadorDocumento';
import Modal from '../../components/Modal';
import type {
  Processo, Movimentacao, Documento, Mensagem, Cliente, Testemunha,
} from '../../types/database';
import {
  STATUS_PROCESSO_LABEL,
  STATUS_PROCESSO_COR,
  TIPO_DOCUMENTO_LABEL,
} from '../../types/database';
import {
  formatarDataHora,
  formatarData,
  formatarTelefone,
  formatarCPF,
  mascaraCPF,
} from '../../lib/utils';
import { toast } from '../../components/Toast';

type Aba = 'timeline' | 'documentos' | 'mensagens' | 'testemunhas';

const FORM_TESTEMUNHA_VAZIO = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  endereco: '',
  cargo: '',
  relacao: '',
};

export default function PortalProcessoDetalhe() {
  const { id } = useParams() as { id: string };
  const { user, perfil } = useAuth();

  const [processo, setProcesso] = useState<Processo | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [aba, setAba] = useState<Aba>('timeline');
  const [loading, setLoading] = useState(true);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docVisualizando, setDocVisualizando] = useState<Documento | null>(null);
  const [alterandoVisibilidade, setAlterandoVisibilidade] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const mensagensEnd = useRef<HTMLDivElement>(null);

  // Testemunhas
  const [testemunhas, setTestemunhas] = useState<Testemunha[]>([]);
  const [modalTestemunha, setModalTestemunha] = useState(false);
  const [editandoTestemunha, setEditandoTestemunha] = useState<Testemunha | null>(null);
  const [formTestemunha, setFormTestemunha] = useState({ ...FORM_TESTEMUNHA_VAZIO });
  const [salvandoTestemunha, setSalvandoTestemunha] = useState(false);
  const [erroTestemunhas, setErroTestemunhas] = useState<string | null>(null);

  // Administrador e advogado são considerados equipe.
  const isEquipe =
    perfil?.papel === 'admin' ||
    perfil?.papel === 'advogado';

  useEffect(() => {
    if (!id) return;

    carregar();
  }, [id, perfil?.papel, user?.uid]);

  useEffect(() => {
    if (aba === 'mensagens') {
      mensagensEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aba]);

  /**
   * Carrega o processo respeitando o papel e a autorização do usuário.
   *
   * ADMIN:
   * Pode consultar qualquer processo.
   *
   * ADVOGADO:
   * Só pode consultar processos cujo advogado_id seja o próprio UID.
   *
   * CLIENTE:
   * Só pode consultar processos vinculados ao próprio cadastro.
   */
  const carregar = async () => {
    if (!id) return;

    // Aguarda a autenticação e o carregamento do perfil.
    if (!user || !perfil) {
      setLoading(true);
      return;
    }

    setLoading(true);

    // Limpa os dados anteriores para evitar exibição de outro processo.
    setProcesso(null);
    setCliente(null);
    setMovimentacoes([]);
    setDocumentos([]);
    setMensagens([]);
    setTestemunhas([]);
    setErroTestemunhas(null);

    try {
      let proc: (Processo & { cliente?: Cliente | null }) | null = null;

      if (perfil.papel === 'admin') {
        // Administrador tem acesso amplo.
        proc = await db.getProcessoComCliente(id);
      } else if (perfil.papel === 'advogado') {
        // Primeiro verifica se o processo pertence ao advogado.
        const processoAdvogado = await db.getProcesso(id);

        if (
          processoAdvogado &&
          processoAdvogado.advogado_id === user.uid
        ) {
          proc = await db.getProcessoComCliente(id);
        }
      } else {
        // Cliente só acessa o próprio processo.
        proc = await db.cliente.getProcesso(user.uid, id);
      }

      // Se não houver autorização, não carrega nenhum dado relacionado.
      if (!proc) {
        setProcesso(null);
        setCliente(null);
        setMovimentacoes([]);
        setDocumentos([]);
        setMensagens([]);
        setTestemunhas([]);
        setLoading(false);
        return;
      }

      setProcesso(proc);
      setCliente('cliente' in proc ? proc.cliente ?? null : null);

      // Carrega movimentações, documentos e mensagens.
      const [movs, docs, msgs] = await Promise.all([
        isEquipe
          ? db.listMovimentacoes(id)
          : db.cliente.listMovimentacoes(user.uid, id),

        db.listDocumentosVisivel(
          perfil.papel,
          user.uid,
          id,
        ),

        isEquipe
          ? db.listMensagens(id)
          : db.cliente.listMensagens(user.uid, id),
      ]);

      setMovimentacoes(movs);
      setDocumentos(docs);
      setMensagens(msgs);

      // Carrega testemunhas somente depois de confirmar o acesso ao processo.
      try {
        const test = await db.listTestemunhasVisivel(
          perfil.papel,
          user.uid,
          id,
        );

        setTestemunhas(test);
        setErroTestemunhas(null);
      } catch (e) {
        console.error('Falha ao carregar as testemunhas:', e);

        setTestemunhas([]);

        setErroTestemunhas(
          'Não foi possível carregar as testemunhas. As permissões do Firestore ' +
          'para a coleção "testemunhas" ainda não foram publicadas.',
        );
      }
    } catch (e) {
      console.error('Falha ao carregar os dados do processo:', e);

      setProcesso(null);
      setCliente(null);
      setMovimentacoes([]);
      setDocumentos([]);
      setMensagens([]);
      setTestemunhas([]);

      toast.erro('Não foi possível carregar os dados do processo.');
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !user || !id || !processo) return;

    setEnviando(true);

    try {
      const dadosMensagem = {
        processo_id: id,
        remetente_id: user.uid,
        remetente_nome: perfil?.nome ?? null,
        conteudo: novaMensagem.trim(),
        canal: 'portal' as const,
        lida: false,
      };

      if (isEquipe) {
        await db.createMensagem(dadosMensagem);
      } else {
        await db.cliente.createMensagem(user.uid, dadosMensagem);
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);

      setEnviando(false);
      toast.erro('Erro ao enviar mensagem.');

      return;
    }

    setEnviando(false);
    setNovaMensagem('');

    await carregar();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Permite selecionar novamente o mesmo arquivo depois.
    e.target.value = '';

    if (!file || !user || !id || !processo) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.erro('Arquivo muito grande (máx. 10MB).');
      return;
    }

    setUploading(true);

    const ext = file.name.split('.').pop();
    const caminho = caminhoDocumentoUpload(user.uid, id, ext || 'bin');

    let publicUrl: string;

    try {
      publicUrl = await uploadDocumento(caminho, file);
    } catch (e) {
      console.error('Erro ao enviar arquivo:', e);

      setUploading(false);
      toast.erro('Erro ao enviar arquivo.');

      return;
    }

    try {
      await db.createDocumento({
        processo_id: id,
        nome_arquivo: file.name,
        url: publicUrl,
        tipo: 'outro',
        enviado_por_id: user.uid,

        // Documento enviado pela equipe começa oculto.
        // Documento enviado pelo cliente fica visível.
        visivel: !isEquipe,
      });
    } catch (e) {
      console.error('Erro ao registrar documento:', e);

      setUploading(false);
      toast.erro('Erro ao registrar documento.');

      return;
    }

    setUploading(false);

    toast.sucesso(
      isEquipe
        ? 'Documento enviado. Libere a visualização para o cliente quando desejar.'
        : 'Documento enviado!',
    );

    await carregar();
  };

  const baixarDocumento = async (documento: Documento) => {
    try {
      await baixarDocumentoURL(documento.url, documento.nome_arquivo);
    } catch (e) {
      console.error('Erro ao baixar documento:', e);
      toast.erro('Não foi possível baixar o documento.');
    }
  };

  /**
   * Altera a visibilidade de um documento.
   * Somente administrador e advogado responsável podem executar esta ação.
   */
  const alterarVisibilidadeDocumento = async (
    documento: Documento,
    visivel: boolean,
  ) => {
    if (!isEquipe || !user || !processo) {
      toast.erro('Você não tem permissão para alterar esta configuração.');
      return;
    }

    // Advogado só pode alterar documentos de processo atribuído a ele.
    if (
      perfil?.papel === 'advogado' &&
      processo.advogado_id !== user.uid
    ) {
      toast.erro('Você não tem permissão para alterar documentos deste processo.');
      return;
    }

    setAlterandoVisibilidade(documento.id);

    try {
      await db.updateDocumentoVisibilidade(documento.id, visivel);

      setDocumentos((atuais) =>
        atuais.map((d) =>
          d.id === documento.id
            ? { ...d, visivel }
            : d,
        ),
      );

      if (docVisualizando?.id === documento.id) {
        setDocVisualizando({ ...documento, visivel });
      }

      toast.sucesso(
        visivel
          ? 'Documento liberado para o cliente!'
          : 'Documento ocultado do cliente!',
      );
    } catch (e) {
      console.error('Erro ao alterar visibilidade:', e);
      toast.erro('Não foi possível alterar a visibilidade do documento.');
    } finally {
      setAlterandoVisibilidade(null);
    }
  };

  /* ============================================================
   * TESTEMUNHAS
   * ============================================================ */

  const abrirModalNovaTestemunha = () => {
    setEditandoTestemunha(null);
    setFormTestemunha({ ...FORM_TESTEMUNHA_VAZIO });
    setModalTestemunha(true);
  };

  const abrirModalEditarTestemunha = (t: Testemunha) => {
    setEditandoTestemunha(t);

    setFormTestemunha({
      nome: t.nome ?? '',
      email: t.email ?? '',
      telefone: t.telefone ?? '',
      cpf: t.cpf ?? '',
      endereco: t.endereco ?? '',
      cargo: t.cargo ?? '',
      relacao: t.relacao ?? '',
    });

    setModalTestemunha(true);
  };

  const salvarTestemunha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !id || !processo) return;

    if (!formTestemunha.nome.trim()) {
      toast.erro('Informe o nome da testemunha.');
      return;
    }

    setSalvandoTestemunha(true);

    const dados = {
      nome: formTestemunha.nome.trim(),
      email: formTestemunha.email.trim() || null,
      telefone: formTestemunha.telefone.trim() || null,
      cpf: formTestemunha.cpf.trim() || null,
      endereco: formTestemunha.endereco.trim() || null,
      cargo: formTestemunha.cargo.trim() || null,
      relacao: formTestemunha.relacao.trim() || null,
    };

    try {
      if (editandoTestemunha) {
        if (isEquipe) {
          await db.updateTestemunha(editandoTestemunha.id, dados);
        } else {
          await db.cliente.updateTestemunha(
            user.uid,
            editandoTestemunha.id,
            dados,
          );
        }
      } else {
        if (isEquipe) {
          await db.createTestemunha({
            ...dados,
            processo_id: id,
          });
        } else {
          await db.cliente.createTestemunha(user.uid, {
            ...dados,
            processo_id: id,
          });
        }
      }
    } catch (e) {
      console.error('Erro ao salvar testemunha:', e);

      setSalvandoTestemunha(false);
      toast.erro('Erro ao salvar a testemunha.');

      return;
    }

    setSalvandoTestemunha(false);
    setModalTestemunha(false);
    setEditandoTestemunha(null);
    setFormTestemunha({ ...FORM_TESTEMUNHA_VAZIO });

    toast.sucesso(
      editandoTestemunha
        ? 'Testemunha atualizada!'
        : 'Testemunha registrada!',
    );

    await carregar();
  };

  const excluirTestemunha = async (t: Testemunha) => {
    if (!user || !processo) return;

    if (!confirm(`Remover a testemunha "${t.nome}"?`)) return;

    try {
      if (isEquipe) {
        await db.deleteTestemunha(t.id);
      } else {
        await db.cliente.deleteTestemunha(user.uid, t.id);
      }
    } catch (e) {
      console.error('Erro ao remover testemunha:', e);
      toast.erro('Erro ao remover a testemunha.');

      return;
    }

    toast.sucesso('Testemunha removida.');

    await carregar();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="text-ink-300 mx-auto mb-3" />

        <p className="text-ink-500">
          Processo não encontrado ou você não tem permissão para acessá-lo.
        </p>

        <Link to="/portal/processos" className="btn-secondary mt-4">
          Voltar
        </Link>
      </div>
    );
  }

  const abas: {
    id: Aba;
    label: string;
    icon: typeof Clock;
    badge?: number;
  }[] = [
    {
      id: 'timeline',
      label: 'Linha do tempo',
      icon: Clock,
      badge: movimentacoes.length,
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: FileText,
      badge: documentos.length,
    },
    {
      id: 'mensagens',
      label: 'Mensagens',
      icon: MessageSquare,
      badge: mensagens.length,
    },
    {
      id: 'testemunhas',
      label: 'Testemunhas',
      icon: Users,
      badge: testemunhas.length,
    },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 w-full">
      <Link
        to="/portal/processos"
        className="inline-flex items-center gap-1 text-ink-500 hover:text-brand-800 text-sm mb-6"
      >
        <ChevronLeft size={18} />
        Voltar aos processos
      </Link>

      {/* Cabeçalho */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-800 flex items-center justify-center shrink-0">
            <Scale size={26} className="text-gold-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-2xl text-brand-900">
                {processo.titulo}
              </h1>

              <span className={`badge ${STATUS_PROCESSO_COR[processo.status]}`}>
                {STATUS_PROCESSO_LABEL[processo.status]}
              </span>
            </div>

            <p className="text-sm text-ink-500 mt-1">
              Processo nº {processo.numero} · {processo.area_direito}
            </p>

            {processo.descricao && (
              <p className="text-sm text-ink-600 mt-3 leading-relaxed">
                {processo.descricao}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-ink-100 overflow-x-auto">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              aba === a.id
                ? 'border-brand-800 text-brand-900'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <a.icon size={16} />
            {a.label}

            {a.badge !== undefined && a.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-ink-100 text-ink-600 text-xs rounded-full">
                {a.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Linha do tempo */}
      {aba === 'timeline' && (
        <div className="space-y-4 animate-fade-in">
          {movimentacoes.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            movimentacoes.map((m, idx) => (
              <div key={m.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      idx === 0 ? 'bg-gold-500' : 'bg-ink-300'
                    }`}
                  />

                  {idx < movimentacoes.length - 1 && (
                    <div className="w-0.5 flex-1 bg-ink-200" />
                  )}
                </div>

                <div className="card p-4 flex-1 mb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium text-brand-900 text-sm">
                      {m.status}
                    </span>

                    <span className="text-xs text-ink-400">
                      {formatarDataHora(m.criado_em)}
                    </span>
                  </div>

                  <p className="text-sm text-ink-600 mt-1">
                    {m.descricao}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Documentos */}
      {aba === 'documentos' && (
        <div className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-lg text-brand-900">
                Documentos do processo
              </h3>

              {isEquipe && (
                <p className="text-xs text-ink-500 mt-1">
                  Defina quais documentos poderão ser visualizados pelo cliente.
                </p>
              )}
            </div>

            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? (
                'Enviando…'
              ) : (
                <>
                  <Upload size={16} />
                  Enviar documento
                </>
              )}
            </button>

            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {documentos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">
              Nenhum documento vinculado a este processo.
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDocVisualizando(d)}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-brand-200 transition-colors cursor-pointer"
                  title="Clique para ler o documento"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-brand-700" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">
                        {d.nome_arquivo}
                      </p>

                      <p className="text-xs text-ink-400">
                        {TIPO_DOCUMENTO_LABEL[d.tipo]} · {formatarData(d.criado_em)}
                      </p>

                      {isEquipe && (
                        <span
                          className={`inline-block mt-1 text-xs font-medium ${
                            d.visivel
                              ? 'text-green-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {d.visivel
                            ? 'Liberado para o cliente'
                            : 'Oculto para o cliente'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEquipe && (
                      <label
                        className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer mr-2"
                        title="Permitir que o cliente visualize este documento"
                      >
                        <input
                          type="checkbox"
                          checked={d.visivel === true}
                          disabled={alterandoVisibilidade === d.id}
                          onChange={(e) =>
                            alterarVisibilidadeDocumento(d, e.target.checked)
                          }
                          className="w-4 h-4 accent-brand-800 cursor-pointer"
                        />

                        <span>
                          {alterandoVisibilidade === d.id
                            ? 'Salvando…'
                            : 'Visível para o cliente'}
                        </span>
                      </label>
                    )}

                    <button
                      onClick={() => setDocVisualizando(d)}
                      className="btn-ghost text-sm"
                      title="Ler documento"
                    >
                      <Eye size={16} />
                      Ler
                    </button>

                    <button
                      onClick={() => baixarDocumento(d)}
                      className="btn-ghost text-sm"
                      title="Baixar arquivo"
                    >
                      <Download size={16} />
                      Baixar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensagens */}
      {aba === 'mensagens' && (
        <div className="animate-fade-in flex flex-col h-[60vh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin bg-brand-50 rounded-lg p-4">
            {mensagens.length === 0 ? (
              <div className="text-center text-ink-500 text-sm py-8">
                Nenhuma mensagem ainda. Inicie a conversa abaixo.
              </div>
            ) : (
              mensagens.map((m) => {
                const minha = m.remetente_id === user?.uid;

                return (
                  <div
                    key={m.id}
                    className={`flex ${minha ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        minha
                          ? 'bg-brand-800 text-brand-50 rounded-br-sm'
                          : 'bg-white border border-ink-100 text-ink-800 rounded-bl-sm'
                      }`}
                    >
                      {m.canal === 'whatsapp' && (
                        <p className="text-[10px] uppercase tracking-wide text-gold-400 mb-1 flex items-center gap-1">
                          <MessageSquare size={10} />
                          WhatsApp
                        </p>
                      )}

                      <p
                        className={`text-[11px] font-medium mb-0.5 ${
                          minha ? 'text-brand-200' : 'text-brand-700'
                        }`}
                      >
                        {minha ? 'Você' : (m.remetente_nome || 'Escritório')}
                      </p>

                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {m.conteudo}
                      </p>

                      <p
                        className={`text-[10px] mt-1 ${
                          minha ? 'text-brand-300' : 'text-ink-400'
                        }`}
                      >
                        {formatarDataHora(m.criado_em)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={mensagensEnd} />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagem();
                }
              }}
              placeholder="Digite sua mensagem…"
              className="input-field"
              disabled={enviando}
            />

            <button
              onClick={enviarMensagem}
              disabled={enviando || !novaMensagem.trim()}
              className="btn-primary px-4"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
            <Paperclip size={12} />
            Para enviar documentos, use a aba Documentos.
          </p>
        </div>
      )}

      {/* Testemunhas */}
      {aba === 'testemunhas' && (
        <div className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-lg text-brand-900">
                Testemunhas do processo
              </h3>

              <p className="text-xs text-ink-500 mt-0.5">
                Registre as pessoas que podem depor sobre os fatos deste processo.
              </p>
            </div>

            <button
              onClick={abrirModalNovaTestemunha}
              className="btn-primary text-sm"
            >
              <Plus size={16} />
              Registrar testemunha
            </button>
          </div>

          {erroTestemunhas && (
            <div className="card p-4 mb-4 flex items-start gap-3 border-l-4 border-l-red-500">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />

              <div>
                <p className="text-sm font-medium text-ink-800">
                  Testemunhas indisponíveis
                </p>

                <p className="text-xs text-ink-500 mt-0.5">
                  {erroTestemunhas}
                </p>
              </div>
            </div>
          )}

          {testemunhas.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">
              {erroTestemunhas
                ? 'Não foi possível carregar as testemunhas deste processo.'
                : 'Nenhuma testemunha registrada neste processo.'}
            </div>
          ) : (
            <div className="space-y-2">
              {testemunhas.map((t) => (
                <div
                  key={t.id}
                  className="card p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        t.ativo ? 'bg-brand-100' : 'bg-ink-100'
                      }`}
                    >
                      <UserCheck
                        size={18}
                        className={t.ativo ? 'text-brand-700' : 'text-ink-400'}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">
                        {t.nome}
                      </p>

                      <p className="text-xs text-ink-400 mt-0.5">
                        {[t.relacao, t.cargo].filter(Boolean).join(' · ') || 'Sem relação informada'}
                      </p>

                      <div className="mt-1.5 space-y-0.5 text-xs text-ink-500">
                        {t.email && <p className="truncate">{t.email}</p>}
                        {t.telefone && <p>{formatarTelefone(t.telefone)}</p>}
                        {t.cpf && <p>CPF: {formatarCPF(t.cpf)}</p>}
                        {t.endereco && <p className="truncate">{t.endereco}</p>}
                      </div>

                      <p className="text-[11px] text-ink-400 mt-1.5">
                        Registrada em {formatarData(t.criado_em)}
                      </p>

                      {!t.ativo && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-ink-100 text-ink-500 text-[11px] rounded-full">
                          Removida
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => abrirModalEditarTestemunha(t)}
                      className="btn-ghost text-sm"
                      title="Editar testemunha"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>

                    {t.ativo && (
                      <button
                        onClick={() => excluirTestemunha(t)}
                        className="btn-ghost text-sm text-danger-600 hover:text-danger-700"
                        title="Remover testemunha"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de cadastro/edição de testemunha */}
      <Modal
        aberto={modalTestemunha}
        onFechar={() => {
          setModalTestemunha(false);
          setEditandoTestemunha(null);
        }}
        titulo={editandoTestemunha ? 'Editar testemunha' : 'Registrar testemunha'}
        tamanho="lg"
      >
        <form onSubmit={salvarTestemunha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Nome completo *
            </label>

            <input
              required
              value={formTestemunha.nome}
              onChange={(e) =>
                setFormTestemunha({
                  ...formTestemunha,
                  nome: e.target.value,
                })
              }
              className="input-field"
              placeholder="Nome da testemunha"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                E-mail
              </label>

              <input
                type="email"
                value={formTestemunha.email}
                onChange={(e) =>
                  setFormTestemunha({
                    ...formTestemunha,
                    email: e.target.value,
                  })
                }
                className="input-field"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Telefone
              </label>

              <input
                value={formTestemunha.telefone}
                onChange={(e) =>
                  setFormTestemunha({
                    ...formTestemunha,
                    telefone: e.target.value,
                  })
                }
                className="input-field"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                CPF
              </label>

              <input
                value={formTestemunha.cpf}
                onChange={(e) =>
                  setFormTestemunha({
                    ...formTestemunha,
                    cpf: mascaraCPF(e.target.value),
                  })
                }
                className="input-field"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Cargo / função
              </label>

              <input
                value={formTestemunha.cargo}
                onChange={(e) =>
                  setFormTestemunha({
                    ...formTestemunha,
                    cargo: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Ex.: sócia, vizinho, auditor"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Relação com o processo
            </label>

            <input
              value={formTestemunha.relacao}
              onChange={(e) =>
                setFormTestemunha({
                  ...formTestemunha,
                  relacao: e.target.value,
                })
              }
              className="input-field"
              placeholder="Ex.: funcionária da empresa ré"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Endereço
            </label>

            <input
              value={formTestemunha.endereco}
              onChange={(e) =>
                setFormTestemunha({
                  ...formTestemunha,
                  endereco: e.target.value,
                })
              }
              className="input-field"
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalTestemunha(false);
                setEditandoTestemunha(null);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvandoTestemunha}
              className="btn-primary"
            >
              {salvandoTestemunha
                ? 'Salvando…'
                : editandoTestemunha
                  ? 'Salvar alterações'
                  : 'Registrar testemunha'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Leitor de documentos */}
      <VisualizadorDocumento
        doc={docVisualizando}
        onClose={() => setDocVisualizando(null)}
      />
    </div>
  );
}