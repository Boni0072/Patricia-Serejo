import { Scale } from 'lucide-react';

interface Props {
  className?: string;
  tamanho?: number;
  comTexto?: boolean;
  variante?: 'claro' | 'escuro';
}

export default function Logo({ className = '', tamanho = 36, comTexto = false, variante = 'escuro' }: Props) {
  const corTexto = variante === 'claro' ? 'text-white' : 'text-brand-900';
  const subCor = variante === 'claro' ? 'text-brand-200' : 'text-ink-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 shadow-sm">
          <Scale size={tamanho * 0.55} className="text-gold-400" strokeWidth={1.5} />
        </div>
      </div>
      {comTexto && (
        <div className="leading-tight">
          <p className={`font-serif text-lg font-semibold ${corTexto}`}>
            Patricia C. Serejo
          </p>
          <p className={`text-xs tracking-[0.2em] uppercase ${subCor}`}>Advocacia</p>
        </div>
      )}
    </div>
  );
}
