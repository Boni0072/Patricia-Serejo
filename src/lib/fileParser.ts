import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { detectColumnType, type ColumnType } from './importTypes';

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export interface ParsedColumn {
  name: string;
  type: ColumnType;
  sample: unknown[];
}

export interface ParsedFile {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: ParsedColumn[];
  rows: Record<string, unknown>[];
}

export function validateFile(file: File): { ok: boolean; error?: string } {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `Formato não suportado. Use: ${ACCEPTED_EXTENSIONS.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `Arquivo excede o limite de 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }
  return { ok: true };
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 20000 && value < 60000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date && date.y) {
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${date.y}-${m}-${d}`;
    }
  }
  if (typeof value === 'string') {
    const s = value.trim();
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
  }
  return null;
}

function normalizeRow(values: unknown[], headers: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    const v = values[i];
    if (v !== null && v !== undefined && v !== '') {
      const parsed = parseDate(v);
      if (parsed) row[h] = parsed;
      else row[h] = v;
    }
  });
  return row;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();

  if (ext === '.csv') {
    return parseCsv(file);
  }
  return parseExcel(file);
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          reject(new Error(result.errors[0]?.message ?? 'Erro ao parsear CSV'));
          return;
        }
        const headers = result.meta.fields ?? [];
        const rows = result.data.map((d) => {
          const row: Record<string, unknown> = {};
          headers.forEach((h) => {
            const v = (d as Record<string, unknown>)[h];
            if (v !== null && v !== undefined && v !== '') {
              const parsed = parseDate(v);
              if (parsed) row[h] = parsed;
              else row[h] = v;
            }
          });
          return row;
        });
        resolve(buildParsed(file, headers, rows));
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha vazia ou sem abas');
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, dateNF: 'yyyy-mm-dd' });
  if (raw.length < 2) throw new Error('Planilha sem dados (apenas cabeçalho ou vazia)');
  const headers = (raw[0] as unknown[]).map((h, i) => String(h ?? `Coluna ${i + 1}`).trim());
  const rows = raw.slice(1).map((r) => normalizeRow(r as unknown[], headers));
  return buildParsed(file, headers, rows);
}

function buildParsed(file: File, headers: string[], rows: Record<string, unknown>[]): ParsedFile {
  const columns: ParsedColumn[] = headers.map((name) => {
    const sample = rows.slice(0, 50).map((r) => r[name]).filter((v) => v !== undefined);
    return { name, type: detectColumnType(sample), sample: rows.slice(0, 5).map((r) => r[name]) };
  });
  return { fileName: file.name, fileSize: file.size, rowCount: rows.length, columns, rows };
}
