import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const sizeMap = { md: 560, lg: 760, xl: 1040 };

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const width = sizeMap[size];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[92vh] w-full"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          >
            {(title || subtitle) && (
              <header className="flex items-start justify-between gap-4 p-5 border-b border-border-subtle">
                <div className="min-w-0">
                  {title && <h2 className="text-base font-semibold text-content">{title}</h2>}
                  {subtitle && <p className="text-xs text-content-muted mt-1">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className={cn(
                    'shrink-0 h-8 w-8 grid place-items-center rounded-lg text-content-muted',
                    'hover:text-content hover:bg-surface-hover transition-colors focus-ring',
                  )}
                >
                  <X size={18} />
                </button>
              </header>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <footer className="p-4 border-t border-border-subtle">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
