import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/format';

interface TabsProps {
  tabs: { id: string; label: ReactNode; content: ReactNode }[];
  defaultId?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ tabs, defaultId, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="flex items-center gap-1 p-1 rounded-xl bg-page border border-border-subtle w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActive(t.id); onChange?.(t.id); }}
            className={cn(
              'px-3.5 h-8 rounded-lg text-xs font-medium transition-all focus-ring',
              t.id === active
                ? 'bg-surface text-content shadow-sm'
                : 'text-content-muted hover:text-content',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current?.content && <div className="mt-4">{current.content}</div>}
    </div>
  );
}
