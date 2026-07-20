import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConteudoSite } from '../hooks/useSiteContent';

export default function WhatsAppFloat() {
  const { conteudo } = useConteudoSite();
  const [aberto, setAberto] = useState(false);

  const numero = conteudo['contato_whatsapp'] || '';
  const mensagem = encodeURIComponent(
    'Olá, gostaria de agendar uma consulta com a Dra. Patricia'
  );
  const link = numero ? `https://wa.me/${numero}?text=${mensagem}` : '';

  useEffect(() => {
    const t = setTimeout(() => setAberto(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!link) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {aberto && (
        <div className="relative bg-white rounded-2xl shadow-xl border border-ink-100 p-4 max-w-xs animate-fade-in">
          <button
            onClick={() => setAberto(false)}
            className="absolute top-2 right-2 text-ink-400 hover:text-ink-700 transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
          <p className="text-sm text-ink-700 pr-4">
            Precisa de ajuda jurídica? Fale conosco agora pelo WhatsApp.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb957] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <MessageCircle size={16} />
            Iniciar conversa
          </a>
        </div>
      )}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAberto(false)}
        className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1fb957] shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle size={26} fill="currentColor" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" style={{ animationDuration: '3s' }} />
      </a>
    </div>
  );
}
