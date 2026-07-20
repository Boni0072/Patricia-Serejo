import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Scale, FileText, Upload, Download, Send, Clock,
  Paperclip, AlertCircle, Calendar, MessageSquare,
} from 'lucide-react';
import * as db from '../../lib/db';
import { uploadDocumento, caminhoDocumentoUpload } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';
import type {
  Processo, Movimentacao, Documento, Mensagem, Cliente,
} from '../../types/database';
import {
  STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR,
  TIPO_DOCUMENTO_LABEL,
} from '../../types/database';
import { formatarDataHora, formatarData, tempoRelativo } from '../../lib/utils';
import { toast } from '../../components/Toast';

type Aba = 'timeline' | 'documentos' | 'mensagens';

export default function PortalProcessoDetalhe() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
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
  const fileInput = useRef<HTMLInputElement>(null);
  const mensagensEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    carregar();
  }, [id]);

  useEffect(() => {
    if (aba === 'mensagens') {
      mensagensEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aba]);

  const carregar = async () => {
    setLoading(true);
    const proc = await db.getProcessoComCliente(id);
    if (proc) {
      setProcesso(proc);
      setCliente(proc.cliente);
    }
    const [movs, docs, msgs] = await Promise.all([
      db.listMovimentacoes(id),
      db.listDocumentos(id),
      db.listMensagens(id),
    ]);
    setMovimentacoes(movs);
    setDocumentos(docs);
    setMensagens(msgs);
    setLoading(false);
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !user || !id) return;
    setEnviando(true);
    try {
      await db.createMensagem({
        processo_id: id,
        remetente_id: user.uid,
        conteudo: novaMensagem.trim(),
        canal: 'portal',
        lida: false,
      });
    } catch {
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
    if (!file || !user || !id) return;
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
    } catch {
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
        enviado_por: user.uid,
      });
    } catch {
      setUploading(false);
      toast.erro('Erro ao registrar documento.');
      return;
    }
    setUploading(false);
    toast.sucesso('Documento enviado!');
    await carregar();
  };

  const baixarDocumento = async (doc: Documento) => {
    try {
      const res = await fetch(doc.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_arquivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(doc.url, '_blank');
    }
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
        <p className="text-ink-500">Processo não encontrado.</p>
        <Link to="/portal/processos" className="btn-secondary mt-4">Voltar</Link>
      </div>
    );
  }

  const abas: { id: Aba; label: string; icon: typeof Clock; badge?: number }[] = [
    { id: 'timeline', label: 'Linha do tempo', icon: Clock, badge: movimentacoes.length },
    { id: 'documentos', label: 'Documentos', icon: FileText, badge: documentos.length },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: mensagens.length },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <Link to="/portal/processos" className="inline-flex items-center gap-1 text-ink-500 hover:text-brand-800 text-sm mb-6">
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
              <h1 className="font-serif text-2xl text-brand-900">{processo.titulo}</h1>
              <span className={`badge ${STATUS_PROCESSO_COR[processo.status]}`}>
                {STATUS_PROCESSO_LABEL[processo.status]}
              </span>
            </div>
            <p className="text-sm text-ink-500 mt-1">
              Processo nº {processo.numero} · {processo.area_direito}
            </p>
            {processo.descricao && (
              <p className="text-sm text-ink-600 mt-3 leading-relaxed">{processo.descricao}</p>
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
              <span className="ml-1 px-1.5 py-0.5 bg-ink-100 text-ink-600 text-xs rounded-full">{a.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
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
                  <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-gold-500' : 'bg-ink-300'}`} />
                  {idx < movimentacoes.length - 1 && <div className="w-0.5 flex-1 bg-ink-200" />}
                </div>
                <div className="card p-4 flex-1 mb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium text-brand-900 text-sm">{m.status}</span>
                    <span className="text-xs text-ink-400">{formatarDataHora(m.criado_em)}</span>
                  </div>
                  <p className="text-sm text-ink-600 mt-1">{m.descricao}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Documentos */}
      {aba === 'documentos' && (
        <div className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg text-brand-900">Documentos do processo</h3>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? 'Enviando…' : (<><Upload size={16} /> Enviar documento</>)}
            </button>
            <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} />
          </div>
          {documentos.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">
              Nenhum documento vinculado a este processo.
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div key={d.id} className="card p-4 flex items-center justify-between hover:border-brand-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-brand-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">{d.nome_arquivo}</p>
                      <p className="text-xs text-ink-400">
                        {TIPO_DOCUMENTO_LABEL[d.tipo]} · {formatarData(d.criado_em)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => baixarDocumento(d)} className="btn-ghost text-sm">
                    <Download size={16} /> Baixar
                  </button>
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
                  <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      minha
                        ? 'bg-brand-800 text-brand-50 rounded-br-sm'
                        : 'bg-white border border-ink-100 text-ink-800 rounded-bl-sm'
                    }`}>
                      {m.canal === 'whatsapp' && (
                        <p className="text-[10px] uppercase tracking-wide text-gold-400 mb-1 flex items-center gap-1">
                          <MessageSquare size={10} /> WhatsApp
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                      <p className={`text-[10px] mt-1 ${minha ? 'text-brand-300' : 'text-ink-400'}`}>
                        {tempoRelativo(m.criado_em)}
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder="Digite sua mensagem…"
              className="input-field"
              disabled={enviando}
            />
            <button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()} className="btn-primary px-4">
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
            <Paperclip size={12} />
            Para enviar documentos, use a aba Documentos.
          </p>
        </div>
      )}
    </div>
  );
}
