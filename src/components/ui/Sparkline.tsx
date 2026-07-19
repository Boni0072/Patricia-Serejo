import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { Status } from '../../types';
import { statusColor } from '../../lib/chartColors';

interface SparklineProps {
  data: { label: string; value: number }[];
  status?: Status;
  height?: number;
  width?: number;
}

export function Sparkline({ data, status = 'neutral', height = 36, width = 90 }: SparklineProps) {
  const color = statusColor(status);
  const valid = data.filter((d) => Number.isFinite(d.value));
  if (valid.length < 2) {
    return <div style={{ height, width }} className="grid place-items-center text-[10px] text-content-muted">sem histórico</div>;
  }
  const min = Math.min(...valid.map((d) => d.value));
  const max = Math.max(...valid.map((d) => d.value));
  const id = `spark-${status}-${Math.round(min)}-${Math.round(max)}`;
  return (
    <div style={{ height, width }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={valid} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min, max]} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
