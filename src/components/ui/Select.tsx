import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/format';

interface SelectProps {
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  options: { label: string; value: string | number }[];
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Select({ value, onChange, options, placeholder = 'Selecionar', clearable, className, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full h-9 px-3 inline-flex items-center justify-between gap-2 rounded-lg text-sm',
          'bg-surface border border-border-subtle hover:border-content-muted/40 transition-colors focus-ring',
          selected ? 'text-content' : 'text-content-muted',
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={15} className={cn('shrink-0 text-content-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-1 min-w-full max-h-64 overflow-y-auto rounded-lg bg-surface border border-border-subtle shadow-card-hover py-1 animate-scale-in origin-top"
        >
          {clearable && (
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-content-muted hover:bg-surface-hover"
            >
              Limpar
            </button>
          )}
          {options.map((o) => (
            <button
              key={String(o.value)}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-surface-hover',
                o.value === value ? 'text-accent font-medium' : 'text-content',
              )}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-content-muted">Sem opções</div>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  hint?: ReactNode;
}

export function Field({ label, children, className, htmlFor, hint }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-content-muted">{label}</label>}
      {children}
      {hint && <p className="text-xs text-content-muted">{hint}</p>}
    </div>
  );
}
