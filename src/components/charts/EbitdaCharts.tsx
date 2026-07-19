import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, BarChart, Cell, ReferenceLine,
} from 'recharts';
import { formatCurrency, formatPercent } from '../../lib/format';

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 };
const GRID = 'var(--border-subtle)';

export interface EbitdaMonthlyPoint {
  label: string;
  ebitda: number;
  receita: number;
  margem: number;
}

function EbitdaEvolutionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const ebitda = payload.find((p: any) => p.dataKey === 'ebitda')?.value ?? 0;
  const margem = payload.find((p: any) => p.dataKey === 'margem')?.value ?? 0;
  return (
    <div className="rounded-lg bg-surface border border-border-subtle shadow-card-hover px-3 py-2 text-xs space-y-1">
      <p className="text-content-muted font-medium">{label}</p>
      <p className="text-content">EBITDA: <strong className="text-accent">{formatCurrency(ebitda, true)}</strong></p>
      <p className="text-content">Margem: <strong className="text-info">{formatPercent(margem)}</strong></p>
    </div>
  );
}

export function EbitdaEvolution({ data }: { data: EbitdaMonthlyPoint[] }) {
  const hasData = data.some((d) => d.ebitda !== 0 || d.receita !== 0);
  if (!hasData) {
    return <div className="h-[280px] grid place-items-center text-sm text-content-muted">Sem dados para o período selecionado.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="ebitdaBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={56} />
        <YAxis yAxisId="left" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, true)} width={62} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={42} domain={[0, 100]} />
        <Tooltip content={<EbitdaEvolutionTooltip />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
        <ReferenceLine yAxisId="right" y={0} stroke="var(--border-subtle)" />
        <Bar yAxisId="left" dataKey="ebitda" fill="url(#ebitdaBar)" radius={[3, 3, 0, 0]} maxBarSize={36} />
        <Line yAxisId="right" type="monotone" dataKey="margem" stroke="rgb(var(--chart-line-1))" strokeWidth={2} dot={{ r: 3, fill: 'rgb(var(--chart-line-1))' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface MarginPoint {
  label: string;
  margemBruta: number;
  margemEbitda: number;
  margemLiquida: number;
}

function MarginTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface border border-border-subtle shadow-card-hover px-3 py-2 text-xs space-y-1">
      <p className="text-content-muted font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-content flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <strong>{formatPercent(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export function MarginEvolution({ data }: { data: MarginPoint[] }) {
  const hasData = data.some((d) => d.margemEbitda !== 0);
  if (!hasData) {
    return <div className="h-[240px] grid place-items-center text-sm text-content-muted">Sem dados de margem.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="mEbitda" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--chart-line-1))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--chart-line-1))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={52} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={42} />
        <Tooltip content={<MarginTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="margemEbitda" name="Margem EBITDA" stroke="rgb(var(--chart-line-1))" strokeWidth={2.5} fill="url(#mEbitda)" dot={{ r: 3, fill: 'rgb(var(--chart-line-1))' }} />
        <Line type="monotone" dataKey="margemBruta" name="Margem Bruta" stroke="var(--status-success)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="margemLiquida" name="Margem Líquida" stroke="var(--accent-primary)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface EbitdaEmpresaPoint {
  empresa: string;
  ebitda: number;
  margem: number;
}

export function EbitdaPorEmpresa({ data }: { data: EbitdaEmpresaPoint[] }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.ebitda - a.ebitda), [data]);
  if (sorted.length === 0) {
    return <div className="h-[260px] grid place-items-center text-sm text-content-muted">Sem dados por empresa.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 44)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, true)} />
        <YAxis type="category" dataKey="empresa" tick={AXIS} tickLine={false} axisLine={false} width={92} />
        <Tooltip
          cursor={{ fill: 'var(--bg-surface-hover)' }}
          formatter={(v: number) => [formatCurrency(v, true), 'EBITDA']}
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'rgb(var(--text-primary) / 0.9)' }}
          labelStyle={{ color: 'rgb(var(--text-primary) / 0.65)' }}
          itemStyle={{ color: 'rgb(var(--text-primary) / 0.9)' }}
        />
        <Bar dataKey="ebitda" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {sorted.map((d, i) => (
            <Cell key={i} fill={d.ebitda >= 0 ? 'var(--accent-primary)' : 'var(--status-danger)'} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface EbitdaBridgeStep {
  label: string;
  value: number;
  type: 'total' | 'positive' | 'negative';
  running: number;
}

export function EbitdaBridge({ steps }: { steps: EbitdaBridgeStep[] }) {
  const data = useMemo(() => steps.map((s) => ({
    ...s,
    base: s.type === 'total' ? 0 : s.running - (s.value >= 0 ? s.value : 0),
    bar: s.type === 'total' ? s.running : Math.abs(s.value),
  })), [steps]);
  const hasData = steps.length > 0 && steps.some((s) => s.value !== 0 || s.running !== 0);
  if (!hasData) {
    return <div className="h-[300px] grid place-items-center text-sm text-content-muted">Sem dados para o bridge.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={64} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, true)} width={62} />
        <Tooltip
          cursor={{ fill: 'var(--bg-surface-hover)' }}
          formatter={(v: number, _n, p: any) => [formatCurrency(v, true), p.payload.type === 'total' ? 'Total' : 'Variação']}
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'rgb(var(--text-primary) / 0.9)' }}
          labelStyle={{ color: 'rgb(var(--text-primary) / 0.65)' }}
          itemStyle={{ color: 'rgb(var(--text-primary) / 0.9)' }}
          labelFormatter={(l) => `${l}`}
        />
        <Bar dataKey="bar" radius={[3, 3, 0, 0]} maxBarSize={48}>
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
