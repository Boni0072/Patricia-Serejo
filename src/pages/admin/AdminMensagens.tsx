import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, ChevronRight, Inbox } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Processo, Mensagem, Cliente } from '../../types/database';
import { tempoRelativo } from '../../lib/utils';
import { toast } from '../../components/Toast';

interface ProcessoComCliente extends Processo {
  cliente?: Cliente | null;
}

interface Conversa {
  processo: ProcessoComCliente;
  mensagens: Mensagem[];
  naoLidas: number;
  ultima: Mensagem | null;
}

export default function AdminMensagens() {
  const { user, perfil } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selecionada, setSelecionada] = useState<Conversa | null>(null);
  const [novaMsg, setNovaMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const papel = perfil?.papel ?? 'admin';
      const uid = user?.uid ?? '';
      const processos = await db.listProcessosComClientesVisiveis(papel, uid);

      const conversasArr: Conversa[] = [];
      for (const p of processos) {
        const m = await db.listMensagens(p.id);
        if (m.length > 0) {
          conversasArr.push({
            processo: p,
            mensagens: m,
            naoLidas: m.filter((x) => !x.lida && x.remetente_id !== user?.uid).length,
            ultima: m[m.length - 1],
          });
        }
      }
      conversasArr.sort((a, b) => {
        const aT = a.ultima ? new Date(a.ultima.criado_em).getTime() : 0;
        const bT = b.ultima ? new Date(b.ultima.criado_em).getTime() : 0;
        return bT - aT;
      });
      setConversas(conversasArr);
      setLoading(false);
    } catch {
      setLoading(false);
      toast.erro('Erro ao carregar as mensagens. Verifique sua permissão de acesso.');
    }
  };

  const selecionar = (c: Conversa) => {
    setSelecionada(c);
    c.mensagens.filter((m) => !m.lida && m.remetente_id !== user?.uid).forEach((m) => {
      db.marcarMensagemLida(m.id);
    });
  };

  const enviar = async () => {
    if (!novaMsg.trim() || !user || !selecionada) return;
    setEnviando(true);
    try {
      await db.createMensagem({
        processo_id: selecionada.processo.id,
        remetente_id: user.uid,
        conteudo: novaMsg.trim(),
        canal: 'portal',
        lida: false,
      });
    } catch {
      setEnviando(false);
      toast.erro('Erro ao enviar.');
      return;
    }
    setEnviando(false);
    setNovaMsg('');
    await carregar();
    const atualizada = conversas.find((c) => c.processo.id === selecionada.processo.id);
    if (atualizada) selecionar(atualizada);
  };

  if (loading) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>;
  }

  const totalNaoLidas = conversas.reduce((acc, c) => acc + c.naoLidas, 0);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Mensagens</h1>
        <p className="text-ink-500 mt-1">
          Caixa de mensagens centralizada.{' '}
          {totalNaoLidas > 0 && <span className="text-danger-600 font-medium">{totalNaoLidas} não lidas</span>}
        </p>
      </div>

      {conversas.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhuma conversa ainda.</p>
          <p className="text-ink-400 text-sm mt-1">As mensagens dos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Lista */}
          <div className="card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-ink-100">
              <p className="text-sm font-medium text-brand-900">Conversas ({conversas.length})</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {conversas.map((c) => (
                <button
                  key={c.processo.id}
                  onClick={() => selecionar(c)}
                  className={`w-full text-left px-4 py-3 border-b border-ink-50 transition-colors ${
                    selecionada?.processo.id === c.processo.id ? 'bg-brand-50' : 'hover:bg-brand-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-900 truncate">
                        {c.processo.cliente?.nome || c.processo.titulo}
                      </p>
                      <p className="text-xs text-ink-400 truncate mt-0.5">
                        {c.ultima?.conteudo}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {c.naoLidas > 0 && (
                        <span className="bg-danger-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {c.naoLidas}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-400">
                        {c.ultima && tempoRelativo(c.ultima.criado_em)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversa */}
          <div className="lg:col-span-2 card overflow-hidden flex flex-col">
            {selecionada ? (
              <>
                <div className="px-4 py-3 border-b border-ink-100">
                  <Link to={`/admin/processos/${selecionada.processo.id}`} className="flex items-center justify-between hover:text-brand-700">
                    <div>
                      <p className="text-sm font-medium text-brand-900">{selecionada.processo.titulo}</p>
                      <p className="text-xs text-ink-400">
                        {selecionada.processo.cliente?.nome} · {selecionada.processo.numero}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-ink-400" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {selecionada.mensagens.map((m) => {
                    const minha = m.remetente_id === user?.uid;
                    return (
                      <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          minha ? 'bg-brand-800 text-brand-50' : 'bg-brand-50 text-ink-800'
                        }`}>
                          {m.canal === 'whatsapp' && (
                            <p className="text-[10px] uppercase tracking-wide text-gold-500 mb-1">WhatsApp</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{m.conteudo}</p>
                          <p className={`text-[10px] mt-1 ${minha ? 'text-brand-300' : 'text-ink-400'}`}>
                            {tempoRelativo(m.criado_em)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-ink-100 p-3 flex gap-2">
                  <input
                    value={novaMsg}
                    onChange={(e) => setNovaMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
                    placeholder="Responder…"
                    className="input-field"
                    disabled={enviando}
                  />
                  <button onClick={enviar} disabled={enviando || !novaMsg.trim()} className="btn-primary px-4">
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-ink-400 text-sm">
                <div className="text-center">
                  <MessageSquare size={32} className="text-ink-300 mx-auto mb-2" />
                  Selecione uma conversa.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
