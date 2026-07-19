import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full h-9 px-3 rounded-lg text-sm bg-surface border border-border-subtle',
        'placeholder:text-content-muted/60 text-content',
        'hover:border-content-muted/40 transition-colors focus-ring',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: InputHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border-subtle',
        'placeholder:text-content-muted/60 text-content resize-y min-h-[80px]',
        'hover:border-content-muted/40 transition-colors focus-ring',
        className,
      )}
      {...(props as object)}
    />
  );
}
