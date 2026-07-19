import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, Send, X, AlertTriangle, BarChart3, Percent,
  Banknote, Target, Loader2, RefreshCw, Bot, User as UserIcon,
} from 'lucide-react';
import { cn } from '../lib/format';
import { buildAiContext } from '../lib/aiContext';
import { supabaseConfigured } from '../lib/supabase';
import type { FactRecord, Alerta } from '../types';
import type { KpiSet, FilterState } from '../lib/kpi';

interface AiAnalystProps {
  kpis: KpiSet | null;
  filtered: FactRecord[];
  filters: FilterState;
  alertas: Alerta[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  { icon: BarChart3, text: 'Faça uma análise geral dos pontos fortes e fracos do período' },
  { icon: AlertTriangle, text: 'O que precisa de atenção imediata?' },
  { icon: Percent, text: 'Analise a margem EBITDA e sugira melhorias' },
  { icon: Banknote, text: 'Como está o fluxo de caixa?' },
  { icon: Target, text: 'Compare budget vs realizado e identifique os maiores desvios' },
];

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-content">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} className="space-y-1 my-1.5">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-content/90 leading-relaxed">
              <span className="text-accent-primary mt-0.5 shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h4 key={key++} className="text-sm font-bold text-content mt-3 mb-1.5">{renderInline(line.slice(3))}</h4>);
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(<h5 key={key++} className="text-xs font-semibold text-content mt-2 mb-1">{renderInline(line.slice(4))}</h5>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="text-sm text-content/90 leading-relaxed my-0.5">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <>{elements}</>;
}

async function streamChat(
  context: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyst`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ context, messages }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      onError(errBody?.error ?? `Erro ${res.status}`);
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.text) onChunk(parsed.text);
        } catch {
          // Skip malformed
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    const msg = err instanceof Error ? err.message : 'Erro de conexão';
    onError(supabaseConfigured ? msg : 'Servidor não configurado. Verifique as credenciais do Supabase.');
  }
}

export function AiAnalyst({ kpis, filtered, filters, alertas }: AiAnalystProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, scrollToBottom]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    const aiMsg: ChatMessage = { role: 'assistant', text: '', streaming: true };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, aiMsg]);
    setInput('');
    setLoading(true);

    const context = buildAiContext(kpis, filtered, filters, alertas);
    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(
      context,
      newMessages,
      (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, text: last.text + chunk, streaming: true };
          }
          return next;
        });
      },
      (err) => {
        setError(err);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.streaming) {
            if (!last.text) {
              next.splice(next.length - 1, 1);
            } else {
              next[next.length - 1] = { ...last, streaming: false };
            }
          }
          return next;
        });
      },
      controller.signal,
    );

    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') {
        next[next.length - 1] = { ...last, streaming: false };
      }
      return next;
    });
    setLoading(false);
    abortRef.current = null;
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'fixed z-30 bottom-20 md:bottom-6 right-4 md:right-6',
          'h-14 w-14 rounded-2xl shadow-lg shadow-accent-primary/30',
          'bg-gradient-to-br from-accent-primary to-accent-secondary',
          'grid place-items-center text-white',
          'transition-shadow hover:shadow-xl hover:shadow-accent-primary/40',
          'focus-ring',
        )}
        aria-label="Abrir assistente IA"
        title="Assistente IA — Analista financeiro"
      >
        <Sparkles size={24} className="drop-shadow" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-surface animate-pulse" />
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute right-0 top-0 h-full bg-surface shadow-2xl flex flex-col w-full sm:w-[440px]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            >
              {/* Header */}
              <header className="relative overflow-hidden border-b border-border-subtle">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/12 to-accent-secondary/8" />
                <div className="relative flex items-start justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary grid place-items-center text-white shadow-md shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-content flex items-center gap-2">
                        Assistente IA
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-1.5 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> online
                        </span>
                      </h2>
                      <p className="text-xs text-content-muted mt-0.5">Analista financeiro · Controladoria</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {messages.length > 0 && (
                      <button
                        onClick={reset}
                        aria-label="Nova conversa"
                        title="Nova conversa"
                        className="h-8 w-8 grid place-items-center rounded-lg text-content-muted hover:text-content hover:bg-surface-hover transition-colors"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Fechar"
                      className="h-8 w-8 grid place-items-center rounded-lg text-content-muted hover:text-content hover:bg-surface-hover transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary grid place-items-center text-white shrink-0 shadow-sm">
                        <Bot size={16} />
                      </div>
                      <div className="card-base p-3.5 rounded-2xl rounded-tl-sm max-w-[85%]">
                        <p className="text-sm text-content/90 leading-relaxed">
                          Olá! Sou seu <strong className="text-content">analista financeiro</strong>. Tenho acesso aos KPIs e dados do dashboard em tempo real.
                        </p>
                        <p className="text-sm text-content-muted leading-relaxed mt-2">
                          Posso identificar pontos fortes, fracos e o que precisa de atenção. Como posso ajudar?
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted/60 px-1">Sugestões</p>
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => send(q.text)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl text-left text-sm',
                            'border border-border-subtle bg-surface hover:bg-surface-hover hover:border-accent-primary/30',
                            'transition-all group',
                          )}
                        >
                          <span className="h-7 w-7 rounded-lg bg-accent-primary/10 text-accent-primary grid place-items-center shrink-0 group-hover:bg-accent-primary/15 transition-colors">
                            <q.icon size={14} />
                          </span>
                          <span className="text-content/90 leading-snug">{q.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                    >
                      <div className={cn(
                        'h-8 w-8 rounded-lg grid place-items-center shrink-0 shadow-sm',
                        msg.role === 'user'
                          ? 'bg-content-muted/15 text-content-muted'
                          : 'bg-gradient-to-br from-accent-primary to-accent-secondary text-white',
                      )}>
                        {msg.role === 'user' ? <UserIcon size={15} /> : <Bot size={16} />}
                      </div>
                      <div className={cn(
                        'max-w-[85%] p-3.5 rounded-2xl',
                        msg.role === 'user'
                          ? 'bg-accent-primary text-white rounded-tr-sm'
                          : 'card-base rounded-tl-sm',
                      )}>
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        ) : msg.text ? (
                          <div className="rendered-markdown">
                            {renderMarkdown(msg.text)}
                            {msg.streaming && <span className="inline-block w-1.5 h-4 bg-accent-primary rounded-full ml-0.5 animate-pulse align-middle" />}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-content-muted">
                            <span className="h-2 w-2 rounded-full bg-content-muted/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-content-muted/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-content-muted/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Erro na análise</p>
                      <p className="text-xs text-danger/80 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <footer className="border-t border-border-subtle p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder="Pergunte sobre os indicadores..."
                      rows={1}
                      disabled={loading}
                      className={cn(
                        'w-full resize-none px-3.5 py-2.5 pr-10 rounded-xl text-sm',
                        'bg-page border border-border-subtle',
                        'text-content placeholder:text-content-muted/60',
                        'focus:outline-none focus:border-accent-primary/40 focus:ring-2 focus:ring-accent-primary/15',
                        'disabled:opacity-50 transition-all',
                        'max-h-28 min-h-[42px]',
                      )}
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
                      }}
                    />
                  </div>
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim() || loading}
                    className={cn(
                      'h-[42px] w-[42px] rounded-xl grid place-items-center shrink-0',
                      'bg-accent-primary text-white shadow-md',
                      'hover:brightness-110 active:scale-95 transition-all',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                    )}
                    aria-label="Enviar"
                  >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
                <p className="text-[10px] text-content-muted/50 mt-1.5 text-center">
                  Enter para enviar · Shift+Enter para quebrar linha
                </p>
              </footer>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
