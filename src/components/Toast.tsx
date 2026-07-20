import { createRoot, Root } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type TipoToast = 'sucesso' | 'erro' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

let root: Root | null = null;
let toasts: Toast[] = [];
let contadorId = 0;
const listeners = new Set<(t: Toast[]) => void>();

function notificar(tipo: TipoToast, mensagem: string) {
  const id = ++contadorId;
  toasts = [...toasts, { id, tipo, mensagem }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toasts));
  }, 4500);
}

export const toast = {
  sucesso: (m: string) => notificar('sucesso', m),
  erro: (m: string) => notificar('erro', m),
  info: (m: string) => notificar('info', m),
};

function ToastContainer() {
  const [itens, setItens] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setItens);
    return () => {
      listeners.delete(setItens);
    };
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
      {itens.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 bg-white rounded-lg shadow-lg border border-ink-100 px-4 py-3 animate-slide-in-right"
        >
          {t.tipo === 'sucesso' && <CheckCircle2 size={20} className="text-success-600 mt-0.5 shrink-0" />}
          {t.tipo === 'erro' && <AlertCircle size={20} className="text-danger-600 mt-0.5 shrink-0" />}
          {t.tipo === 'info' && <Info size={20} className="text-brand-600 mt-0.5 shrink-0" />}
          <p className="text-sm text-ink-800 flex-1">{t.mensagem}</p>
          <button
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              listeners.forEach((l) => l(toasts));
            }}
            className="text-ink-400 hover:text-ink-700"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider() {
  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'toast-root';
    document.body.appendChild(el);
    root = createRoot(el);
    root.render(<ToastContainer />);
    return () => {
      // Adia a desmontagem para evitar a condição de corrida em modo de desenvolvimento.
      setTimeout(() => {
        root?.unmount();
        el.remove();
      }, 0);
    };
  }, []);

  return null;
}
