import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
  tamanho?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ aberto, onFechar, titulo, children, tamanho = 'md' }: Props) {
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onFechar();
      };
      window.addEventListener('keydown', handler);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handler);
      };
    }
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const largura = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[tamanho];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in"
        onClick={onFechar}
      />
      <div className={`relative w-full ${largura} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="font-serif text-xl text-brand-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="text-ink-400 hover:text-ink-700 transition-colors p-1 rounded-lg hover:bg-ink-100"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
