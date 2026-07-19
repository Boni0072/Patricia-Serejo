import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (compact && abs >= 1_000_000_000)
    return `${value < 0 ? '-' : ''}R$ ${(abs / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`;
  if (compact && abs >= 1_000_000)
    return `${value < 0 ? '-' : ''}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (compact && abs >= 1_000)
    return `${value < 0 ? '-' : ''}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '—';
  if (compact)
    return value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 2 });
  return value.toLocaleString('pt-BR');
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatSignedPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function monthLabel(mes: number): string {
  const names = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  return names[(mes - 1) % 12] ?? String(mes);
}

export function monthFullLabel(mes: number): string {
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return names[(mes - 1) % 12] ?? String(mes);
}

export function performanceStatus(
  value: number,
  thresholds: { good: number; warn: number },
  higherIsBetter = true,
): 'success' | 'warning' | 'danger' {
  if (!Number.isFinite(value)) return 'danger';
  if (higherIsBetter) {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.warn) return 'warning';
    return 'danger';
  }
  if (value <= thresholds.good) return 'success';
  if (value <= thresholds.warn) return 'warning';
  return 'danger';
}

export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : current > 0 ? 100 : -100;
  return ((current - previous) / Math.abs(previous)) * 100;
}
