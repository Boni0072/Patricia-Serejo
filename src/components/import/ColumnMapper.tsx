import { useMemo } from 'react';
import { ArrowRight, Wand2, CheckCheck } from 'lucide-react';
import { Select, Field } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FIELD_OPTIONS, suggestField, type ColumnType } from '../../lib/importTypes';
import type { ColumnMapping } from '../../lib/importValidation';
import { cn } from '../../lib/format';

interface ColumnMapperProps {
  columns: { name: string; type: ColumnType; sample: unknown[] }[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onAutoMap: () => void;
  onClear: () => void;
}

const typeTone: Record<ColumnType, 'info' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  text: 'neutral',
  number: 'info',
  currency: 'success',
  percent: 'warning',
  date: 'info',
  boolean: 'neutral',
};

const typeLabel: Record<ColumnType, string> = {
  text: 'texto',
  number: 'número',
  currency: 'moeda',
  percent: 'percentual',
  date: 'data',
  boolean: 'booleano',
};

export function ColumnMapper({ columns, mapping, onMappingChange, onAutoMap, onClear }: ColumnMapperProps) {
  const mappedCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);

  const autoMapAll = () => {
    const next: ColumnMapping = {};
    columns.forEach((c) => {
      const suggestion = suggestField(c.name);
      if (suggestion) next[c.name] = suggestion;
    });
    onMappingChange(next);
    onAutoMap();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-content-muted">
          {mappedCount} de {columns.length} colunas mapeadas
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" leftIcon={<CheckCheck size={14} />} onClick={onClear}>
            Limpar
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<Wand2 size={14} />} onClick={autoMapAll}>
            Mapear automaticamente
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {columns.map((col) => {
          const suggestion = suggestField(col.name);
          const mapped = mapping[col.name];
          const isSuggested = mapped && suggestion && mapped === suggestion;
          return (
            <div
              key={col.name}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                mapped ? 'border-accent/30 bg-accent/5' : 'border-border-subtle bg-page',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-content truncate">{col.name}</span>
                  <Badge tone={typeTone[col.type]}>{typeLabel[col.type]}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
                  <span className="text-foreground-muted/60">Ex:</span>
                  {col.sample.slice(0, 3).map((s, i) => (
                    <span key={i} className="truncate max-w-[120px]">
                      {s === undefined || s === null || s === '' ? '—' : String(s)}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-content-muted" />
              <div className="w-56 shrink-0">
                <Field>
                  <Select
                    value={mapped}
                    onChange={(v) => onMappingChange({ ...mapping, [col.name]: v as string | undefined })}
                    options={FIELD_OPTIONS}
                    placeholder="Ignorar coluna"
                    clearable
                    ariaLabel={`Mapear coluna ${col.name}`}
                  />
                </Field>
                {isSuggested && (
                  <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                    <Wand2 size={10} /> sugerido automaticamente
                  </p>
                )}
                {!mapped && suggestion && (
                  <button
                    onClick={() => onMappingChange({ ...mapping, [col.name]: suggestion })}
                    className="text-[10px] text-content-muted hover:text-accent mt-1 flex items-center gap-1 transition-colors"
                  >
                    <Wand2 size={10} /> sugerir: {FIELD_OPTIONS.find((f) => f.value === suggestion)?.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
