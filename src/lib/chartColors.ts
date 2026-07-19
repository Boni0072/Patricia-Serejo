import type { Status } from '../types';

// Cores usadas nos gráficos — sempre lidas do CSS para acompanhar o tema.
export function statusColor(s: Status): string {
  switch (s) {
    case 'success': return 'var(--status-success)';
    case 'warning': return 'var(--status-warning)';
    case 'danger': return 'var(--status-danger)';
    case 'info': return 'var(--status-info)';
    default: return 'var(--text-muted)';
  }
}

// Paleta neutra (não-semântica) para séries em treemap/heatmap.
export const PALETTE: string[] = [
  '#2DD4A7', '#5B8DEF', '#8B7CF6', '#F5A623', '#22C55E',
  '#F0554D', '#06B6D4', '#EC4899', '#A855F7', '#84CC16',
  '#14B8A6', '#F97316', '#3B82F6', '#EAB308', '#94A3B8',
];

export function paletteColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}
