import type { FactRecord, TipoMovimento } from '../types';
import type { ColumnType } from './importTypes';
import { FIELD_BY_KEY, TIPO_MOVIMENTO_VALUES } from './importTypes';
import type { ParsedFile } from './fileParser';

export type ColumnMapping = Record<string, string | undefined>;

export interface ValidationRow {
  index: number;
  record: Partial<FactRecord>;
  errors: string[];
}

export interface ValidationReport {
  total: number;
  valid: number;
  invalid: number;
  duplicateKeys: number;
  rows: ValidationRow[];
  duplicateIndexes: Set<number>;
  errorsByType: Record<string, number>;
}

export interface MapOptions {
  delimiter?: string;
  thousandSeparator?: string;
}

function parseNumber(value: unknown, type: ColumnType, opts: MapOptions): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  let s = String(value).trim();
  if (!s) return null;
  if (type === 'percent') {
    const m = s.match(/-?\d+([.,]\d+)?/);
    if (m) return Number(m[0].replace(',', '.')) / 100;
  }
  if (type === 'currency' || type === 'number') {
    s = s.replace(/[R$\s€]/gi, '').replace(/USD|EUR|BRL/i, '');
    if (opts.thousandSeparator === '.' || /\.\d{3}/.test(s)) {
      s = s.replace(/\.(?=\d{3})/g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseTipoMovimento(value: unknown): TipoMovimento | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const s = String(value).trim().toUpperCase();
  const found = TIPO_MOVIMENTO_VALUES.find((t) => t === s || t === s.replace(/[^A-Z]/g, ''));
  if (found) return found;
  if (/RECEIT|FATUR|VENDA/i.test(s)) return 'RECEITA';
  if (/CAPEX|INVEST|ATIVO|IMOB/i.test(s)) return 'CAPEX';
  if (/OPEX|OPERAC|DESPESA|CUSTO/i.test(s)) return 'OPEX';
  if (/DESP/i.test(s)) return 'DESPESA';
  return 'OUTRO';
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (['sim', 'true', '1', 'yes', 'x'].includes(s)) return true;
  if (['não', 'nao', 'false', '0', 'no', '-'].includes(s)) return false;
  return undefined;
}

function parseDateField(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const d = br[1].padStart(2, '0');
    const m = br[2].padStart(2, '0');
    let y = br[3];
    if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function mapRow(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
  columnTypes: Record<string, ColumnType>,
  opts: MapOptions = {},
): Partial<FactRecord> {
  const rec: Partial<FactRecord> = {};
  for (const [colName, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue;
    const field = FIELD_BY_KEY.get(fieldKey as keyof FactRecord);
    if (!field) continue;
    const raw = row[colName];
    if (raw === undefined || raw === null || raw === '') continue;
    const type = columnTypes[colName] ?? field.type;

    switch (field.type) {
      case 'date': {
        const v = parseDateField(raw);
        if (v) (rec as Record<string, unknown>)[field.key] = v;
        break;
      }
      case 'number':
      case 'currency':
      case 'percent': {
        const v = parseNumber(raw, type, opts);
        if (v !== null) (rec as Record<string, unknown>)[field.key] = v;
        break;
      }
      case 'boolean': {
        const v = parseBoolean(raw);
        if (v !== undefined) (rec as Record<string, unknown>)[field.key] = v;
        break;
      }
      default: {
        if (field.key === 'tipoMovimento') {
          const v = parseTipoMovimento(raw);
          if (v) rec.tipoMovimento = v;
        } else {
          (rec as Record<string, unknown>)[field.key] = String(raw).trim();
        }
      }
    }
  }
  return rec;
}

export function computeAnoMes(data: string): { ano: number; mes: number } | null {
  const m = data.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

export function validateImport(parsed: ParsedFile, mapping: ColumnMapping, columnTypes: Record<string, ColumnType>): ValidationReport {
  const rows: ValidationRow[] = [];
  const errorsByType: Record<string, number> = {};
  const seenKeys = new Map<string, number>();
  const duplicateIndexes = new Set<number>();
  const REQUIRED: (keyof FactRecord)[] = ['empresa', 'data', 'valor'];

  parsed.rows.forEach((row, i) => {
    const record = mapRow(row, mapping, columnTypes);
    const errors: string[] = [];

    for (const req of REQUIRED) {
      const v = record[req];
      if (v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v))) {
        errors.push(`Campo obrigatório ausente: ${req}`);
        errorsByType['required'] = (errorsByType['required'] ?? 0) + 1;
      }
    }

    if (record.data) {
      const am = computeAnoMes(record.data);
      if (!am) {
        errors.push('Data inválida');
        errorsByType['date'] = (errorsByType['date'] ?? 0) + 1;
      } else {
        record.ano = am.ano;
        record.mes = am.mes;
      }
    }

    if (record.valor !== undefined && typeof record.valor === 'number' && isNaN(record.valor)) {
      errors.push('Valor não é numérico');
      errorsByType['valor'] = (errorsByType['valor'] ?? 0) + 1;
    }

    const key = [record.empresa, record.documento, record.data, record.valor]
      .map((v) => (v === undefined ? '' : String(v)))
      .join('|');
    if (key.replace(/\|/g, '').length > 0) {
      if (seenKeys.has(key)) {
        duplicateIndexes.add(i);
        errors.push('Possível duplicidade (empresa+documento+data+valor)');
        errorsByType['duplicate'] = (errorsByType['duplicate'] ?? 0) + 1;
      } else {
        seenKeys.set(key, i);
      }
    }

    rows.push({ index: i, record, errors });
  });

  const valid = rows.filter((r) => r.errors.length === 0).length;
  return {
    total: rows.length,
    valid,
    invalid: rows.length - valid,
    duplicateKeys: duplicateIndexes.size,
    rows,
    duplicateIndexes,
    errorsByType,
  };
}

export function buildFactRecords(report: ValidationReport, includeErrors: boolean, sourceFile: string): FactRecord[] {
  const now = new Date().toISOString();
  return report.rows
    .filter((r) => includeErrors || r.errors.length === 0)
    .map((r, i) => ({
      id: `imp-${Date.now()}-${i}`,
      empresa: r.record.empresa ?? 'Não informado',
      loja: r.record.loja,
      centroCusto: r.record.centroCusto,
      contaContabil: r.record.contaContabil,
      projeto: r.record.projeto,
      fornecedor: r.record.fornecedor,
      documento: r.record.documento,
      notaFiscal: r.record.notaFiscal,
      data: r.record.data ?? new Date().toISOString().slice(0, 10),
      ano: r.record.ano ?? new Date().getFullYear(),
      mes: r.record.mes ?? new Date().getMonth() + 1,
      categoria: r.record.categoria,
      grupo: r.record.grupo,
      subgrupo: r.record.subgrupo,
      valor: r.record.valor ?? 0,
      quantidade: r.record.quantidade,
      status: r.record.status,
      responsavel: r.record.responsavel,
      cliente: r.record.cliente,
      tipoMovimento: r.record.tipoMovimento,
      budget: r.record.budget,
      realizado: r.record.realizado,
      forecast: r.record.forecast,
      depreciacao: r.record.depreciacao,
      imobilizado: r.record.imobilizado,
      sourceFile,
      importedAt: now,
    }));
}
