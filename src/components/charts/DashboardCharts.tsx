import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, ComposedChart, Area, Cell,
} from 'recharts';
import { Drawer } from '../ui/Drawer';
import { formatCurrency, formatNumber, monthLabel } from '../../lib/format';
import { paletteColor } from '../../lib/chartColors';
import type { FactRecord } from '../../types';

export interface ChartProps {
  data: FactRecord[];
  onDrillDown: (filter: Partial<FactRecord>, title: string) => void;
  height?: number;
}

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 };
const GRID = 'var(--border-subtle)';

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface border border-border-subtle shadow-card-hover px-3 py-2 text-xs">
      {label && <p className="text-content-muted mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-content">{p.name}: <strong>{formatter ? formatter(p.value) : formatCurrency(p.value)}</strong></span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message = 'Sem dados para o período selecionado', height = 260 }: { message?: string; height?: number }) {
  return (
    <div className="grid place-items-center text-sm text-content-muted" style={{ height }}>
      <div className="text-center">
        <div className="h-10 w-10 rounded-full bg-content-muted/10 mx-auto mb-2 grid place-items-center">
          <span className="text-content-muted text-lg">∅</span>
        </div>
        {message}
      </div>
    </div>
  );
}

export function ReceitaLucroChart({ data, onDrillDown, height = 260 }: ChartProps) {
  void onDrillDown;
  const [drill, setDrill] = useState<{ mes: number } | null>(null);
  const series = useMemo(() => {
    const map = new Map<number, { receita: number; despesa: number; lucro: number }>();
    for (let m = 1; m <= 12; m++) map.set(m, { receita: 0, despesa: 0, lucro: 0 });
    data.forEach((r) => {
      const cur = map.get(r.mes)!;
      if (r.tipoMovimento === 'RECEITA') cur.receita += r.valor;
      else cur.despesa += Math.abs(r.valor);
    });
    map.forEach((v) => (v.lucro = v.receita - v.despesa));
    return Array.from(map.entries()).map(([m, v]) => ({ mes: m, label: monthLabel(m), ...v }));
  }, [data]);

  const hasData = series.some((s) => s.receita !== 0 || s.despesa !== 0);

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={56} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="receita" name="Receita" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} maxBarSize={26} cursor="pointer" onClick={(d: any) => setDrill({ mes: d.payload.mes })} />
            <Bar dataKey="despesa" name="Despesas" fill="var(--text-muted)" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={26} cursor="pointer" onClick={(d: any) => setDrill({ mes: d.payload.mes })} />
            <Line type="monotone" dataKey="lucro" name="Lucro" stroke="rgb(var(--chart-line-1))" strokeWidth={2} dot={{ r: 3, fill: 'rgb(var(--chart-line-1))' }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <Drawer open={!!drill} onClose={() => setDrill(null)} title={`Detalhe — ${drill ? monthLabel(drill.mes) : ''}`} subtitle="Lançamentos do mês selecionado">
        <DrillList records={data} filter={drill ? { mes: drill.mes } : {}} />
      </Drawer>
    </>
  );
}

export function BudgetVsRealChart({ data, onDrillDown, height = 260 }: ChartProps) {
  const series = useMemo(() => {
    const map = new Map<string, { budget: number; realizado: number }>();
    data.forEach((r) => {
      if (!r.centroCusto) return;
      const cur = map.get(r.centroCusto) ?? { budget: 0, realizado: 0 };
      cur.budget += r.budget ?? 0;
      cur.realizado += Math.abs(r.realizado ?? 0);
      map.set(r.centroCusto, cur);
    });
    return Array.from(map.entries()).map(([cc, v]) => ({ cc, ...v })).sort((a, b) => b.realizado - a.realizado).slice(0, 8);
  }, [data]);

  const hasData = series.length > 0;

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={series} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} />
            <YAxis type="category" dataKey="cc" tick={AXIS} tickLine={false} axisLine={false} width={92} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="budget" name="Budget" fill="var(--text-muted)" fillOpacity={0.4} radius={[0, 4, 4, 0]} maxBarSize={18} cursor="pointer" onClick={(d: any) => onDrillDown({ centroCusto: d.payload.cc }, `Budget x Real — ${d.payload.cc}`)} />
            <Bar dataKey="realizado" name="Realizado" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} maxBarSize={18} cursor="pointer" onClick={(d: any) => onDrillDown({ centroCusto: d.payload.cc }, `Budget x Real — ${d.payload.cc}`)} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export function CapexPorCategoriaChart({ data, onDrillDown, height = 260 }: ChartProps) {
  void onDrillDown;
  const [drill, setDrill] = useState<{ categoria: string } | null>(null);
  const series = useMemo(() => {
    const map = new Map<string, number>();
    data.filter((r) => r.tipoMovimento === 'CAPEX').forEach((r) => {
      const k = r.categoria ?? 'Outros';
      map.set(k, (map.get(k) ?? 0) + Math.abs(r.valor));
    });
    return Array.from(map.entries()).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [data]);

  const hasData = series.length > 0;

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="categoria" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={56} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
            <Bar dataKey="valor" name="CAPEX" radius={[4, 4, 0, 0]} maxBarSize={42} cursor="pointer" onClick={(d: any) => setDrill({ categoria: d.payload.categoria })}>
              {series.map((_, i) => <Cell key={i} fill={paletteColor(i)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <Drawer open={!!drill} onClose={() => setDrill(null)} title={`CAPEX — ${drill?.categoria ?? ''}`} subtitle="Lançamentos da categoria selecionada">
        <DrillList records={data} filter={drill ? { categoria: drill.categoria } : {}} />
      </Drawer>
    </>
  );
}

export function FluxoCaixaChart({ data, onDrillDown, height = 260 }: ChartProps) {
  void onDrillDown;
  const series = useMemo(() => {
    const map = new Map<number, { entradas: number; saidas: number; saldo: number }>();
    for (let m = 1; m <= 12; m++) map.set(m, { entradas: 0, saidas: 0, saldo: 0 });
    data.forEach((r) => {
      const cur = map.get(r.mes)!;
      if (r.valor > 0) cur.entradas += r.valor;
      else cur.saidas += Math.abs(r.valor);
    });
    let acc = 0;
    const arr = Array.from(map.entries()).map(([m, v]) => {
      v.saldo = (acc += v.entradas - v.saidas);
      return { mes: m, label: monthLabel(m), ...v };
    });
    return arr;
  }, [data]);

  const hasData = series.some((s) => s.entradas !== 0 || s.saidas !== 0);

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="fc-saldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--chart-saldo))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(var(--chart-saldo))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={56} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="entradas" name="Entradas" fill="var(--status-success)" fillOpacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="saidas" name="Saídas" fill="var(--status-danger)" fillOpacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Area type="monotone" dataKey="saldo" name="Saldo" stroke="rgb(var(--chart-saldo))" strokeWidth={2.5} fill="url(#fc-saldo)" dot={{ r: 3, fill: 'rgb(var(--chart-saldo))' }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export function ReceitaPorEmpresaChart({ data, onDrillDown, height = 260 }: ChartProps) {
  const series = useMemo(() => {
    const map = new Map<string, number>();
    data.filter((r) => r.tipoMovimento === 'RECEITA').forEach((r) => {
      map.set(r.empresa, (map.get(r.empresa) ?? 0) + r.valor);
    });
    return Array.from(map.entries()).map(([empresa, valor]) => ({ empresa, valor })).sort((a, b) => b.valor - a.valor);
  }, [data]);

  const hasData = series.length > 0;
  const max = hasData ? Math.max(...series.map((s) => s.valor)) : 0;

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <div className="space-y-3 pt-1">
          {series.map((s, i) => {
            const pct = max > 0 ? (s.valor / max) * 100 : 0;
            return (
              <button
                key={s.empresa}
                onClick={() => onDrillDown({ empresa: s.empresa }, `Receita — ${s.empresa}`)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 text-content">
                    <span className="h-5 w-5 rounded-full bg-content-muted/15 text-content-muted grid place-items-center text-[10px] font-bold">{i + 1}</span>
                    {s.empresa}
                  </span>
                  <span className="font-semibold text-content tabular-nums">{formatCurrency(s.valor, true)}</span>
                </div>
                <div className="h-2 rounded-full bg-content-muted/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${pct}%`, background: i === 0 ? 'var(--accent-primary)' : paletteColor(i) }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export function TopFornecedoresChart({ data, onDrillDown, height = 260 }: ChartProps) {
  const series = useMemo(() => {
    const map = new Map<string, { valor: number; count: number }>();
    data.filter((r) => r.fornecedor).forEach((r) => {
      const cur = map.get(r.fornecedor!) ?? { valor: 0, count: 0 };
      cur.valor += Math.abs(r.valor);
      cur.count += 1;
      map.set(r.fornecedor!, cur);
    });
    return Array.from(map.entries()).map(([fornecedor, v]) => ({ fornecedor, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [data]);

  const hasData = series.length > 0;
  const total = hasData ? series.reduce((a, s) => a + s.valor, 0) : 0;
  const blocked = ['EnergiaMais', 'HardwarePro', 'InsumosBR'];

  return (
    <>
      {!hasData ? <EmptyState height={height} /> : (
        <div className="space-y-2.5 pt-1">
          {series.map((s, i) => {
            const pct = total > 0 ? (s.valor / total) * 100 : 0;
            const isBlocked = blocked.includes(s.fornecedor);
            return (
              <button key={s.fornecedor} onClick={() => onDrillDown({ fornecedor: s.fornecedor }, `Fornecedor — ${s.fornecedor}`)} className="w-full text-left flex items-center gap-3 py-1.5 hover:bg-surface-hover rounded-lg px-2 -mx-2 transition-colors group">
                <span className="h-6 w-6 rounded-full bg-content-muted/15 text-content-muted grid place-items-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-sm text-content">{s.fornecedor}</span>
                {isBlocked && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-danger bg-danger/10 border border-danger/20">bloqueado</span>}
                <span className="text-xs text-content-muted tabular-nums shrink-0">{pct.toFixed(1)}%</span>
                <span className="text-sm font-semibold text-content tabular-nums shrink-0 w-24 text-right">{formatCurrency(s.valor, true)}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function DrillList({ records, filter }: { records: FactRecord[]; filter: Partial<FactRecord> }) {
  const rows = useMemo(
    () => records.filter((r) => Object.entries(filter).every(([k, v]) => r[k as keyof FactRecord] === v)),
    [records, filter],
  );
  const total = rows.reduce((a, r) => a + r.valor, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-content-muted">{rows.length} lançamentos</span>
        <span className="text-content">Total: <strong className={total >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(total)}</strong></span>
      </div>
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border-subtle divide-y divide-border-subtle/60">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-content-muted py-10">Nenhum lançamento encontrado.</p>
        ) : (
          rows.slice(0, 200).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface-hover">
              <div className="min-w-0">
                <p className="text-sm text-content truncate">{r.documento} · {r.fornecedor ?? r.cliente ?? '—'}</p>
                <p className="text-[11px] text-content-muted truncate">{r.categoria} · {r.empresa}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums shrink-0 ${r.valor >= 0 ? 'text-success' : 'text-content'}`}>{formatCurrency(r.valor)}</span>
            </div>
          ))
        )}
        {rows.length > 200 && <p className="text-center text-[11px] text-content-muted py-2">+{rows.length - 200} lançamentos. Exporte para ver todos.</p>}
      </div>
    </div>
  );
}
