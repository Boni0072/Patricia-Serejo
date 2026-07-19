import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { formatCurrency, formatNumber } from '../../lib/format';

export interface WaterfallStep {
  label: string;
  value: number;
  type: 'total' | 'positive' | 'negative';
  running: number;
}

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 };
const GRID = 'var(--border-subtle)';

function WaterfallTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as WaterfallStep;
  return (
    <div className="rounded-lg bg-surface border border-border-subtle shadow-card-hover px-3 py-2 text-xs">
      <p className="text-content-muted mb-1 font-medium">{p.label}</p>
      <p className="text-content">
        Valor: <strong className={p.value >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(p.value)}</strong>
      </p>
      <p className="text-content-muted text-[11px] mt-0.5">Acumulado: {formatCurrency(p.running, true)}</p>
    </div>
  );
}

export function ResultadoWaterfall({ steps }: { steps: WaterfallStep[] }) {
  const data = useMemo(() => steps.map((s) => ({
    ...s,
    base: s.type === 'total' ? 0 : s.running - (s.value >= 0 ? s.value : 0),
    bar: s.type === 'total' ? s.running : Math.abs(s.value),
  })), [steps]);

  const hasData = steps.length > 0 && steps.some((s) => s.value !== 0 || s.running !== 0);

  if (!hasData) {
    return (
      <div className="h-[300px] grid place-items-center text-sm text-content-muted">
        Sem dados para o período selecionado.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={64} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={60} />
        <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
        <Bar dataKey="bar" radius={[3, 3, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.type === 'total' ? 'var(--accent-primary)' : d.value >= 0 ? 'var(--status-success)' : 'var(--status-danger)'}
              fillOpacity={d.type === 'total' ? 0.9 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
