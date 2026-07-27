import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Processo, Mensagem } from '../../types/database';
import { tempoRelativo } from '../../lib/utils';

interface ProcessoComMensagens extends Processo {
  ultimas_mensagens?: Mensagem[];
}

export default function PortalMensagens() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    db.cliente.listProcessos(user.uid)
      .then((p) => {
        setProcessos(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const selecionar = async (p: Processo) => {
    setProcessoSelecionado(p);
    const m = await db.listMensagens(p.id);
    setMensagens(m);
  };

  const enviar = async () => {
    if (!novaMsg.trim() || !user || !processoSelecionado) return;
    try {
      await db.createMensagem({
        processo_id: processoSelecionado.id,
        remetente_id: user.uid,
        conteudo: novaMsg.trim(),
        canal: 'portal',
        lida: false,
      });
    } catch {
      return;
    }
    setNovaMsg('');
    selecionar(processoSelecionado);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Mensagens</h1>
        <p className="text-ink-500 mt-1">Converse com o escritório sobre seus processos.</p>
      </div>

      {processos.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhum processo disponível para mensagens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Lista de processos */}
          <div className="card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-ink-100">
              <p className="text-sm font-medium text-brand-900">Processos</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {processos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selecionar(p)}
                  className={`w-full text-left px-4 py-3 border-b border-ink-50 transition-colors flex items-center justify-between gap-2 ${
                    processoSelecionado?.id === p.id ? 'bg-brand-50' : 'hover:bg-brand-50/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-900 truncate">{p.titulo}</p>
                    <p className="text-xs text-ink-400 truncate">{p.numero}</p>
                  </div>
                  <ChevronRight size={16} className="text-ink-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Conversa */}
          <div className="lg:col-span-2 card overflow-hidden flex flex-col">
            {processoSelecionado ? (
              <>
                <div className="px-4 py-3 border-b border-ink-100">
                  <p className="text-sm font-medium text-brand-900">{processoSelecionado.titulo}</p>
                  <p className="text-xs text-ink-400">{processoSelecionado.numero}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {mensagens.length === 0 ? (
                    <p className="text-center text-ink-400 text-sm py-8">Nenhuma mensagem ainda.</p>
                  ) : (
                    mensagens.map((m) => {
                      const minha = m.remetente_id === user?.uid;
                      return (
                        <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            minha ? 'bg-brand-800 text-brand-50' : 'bg-brand-50 text-ink-800'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{m.conteudo}</p>
                            <p className={`text-[10px] mt-1 ${minha ? 'text-brand-300' : 'text-ink-400'}`}>
                              {tempoRelativo(m.criado_em)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-ink-100 p-3 flex gap-2">
                  <input
                    value={novaMsg}
                    onChange={(e) => setNovaMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
                    placeholder="Digite sua mensagem…"
                    className="input-field"
                  />
                  <button onClick={enviar} disabled={!novaMsg.trim()} className="btn-primary px-4">
                    Enviar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-ink-400 text-sm">
                Selecione um processo para ver as mensagens.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
