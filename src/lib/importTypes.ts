import type { FactRecord, TipoMovimento } from '../types';

export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'boolean';

export interface FieldDef {
  key: keyof FactRecord;
  label: string;
  group: 'Identificação' | 'Classificação' | 'Valores' | 'Datas' | 'Orçamento' | 'Metadados';
  type: ColumnType;
  required: boolean;
  aliases: string[];
}

export const FIELD_CATALOG: FieldDef[] = [
  { key: 'empresa', label: 'Empresa', group: 'Identificação', type: 'text', required: true, aliases: ['empresa', 'company', 'unidade', 'filial', 'razao social', 'razão social'] },
  { key: 'loja', label: 'Loja', group: 'Identificação', type: 'text', required: false, aliases: ['loja', 'store', 'ponto de venda', 'pdv', 'branch'] },
  { key: 'centroCusto', label: 'Centro de Custo', group: 'Identificação', type: 'text', required: false, aliases: ['centro custo', 'centro de custo', 'cost center', 'cc', 'ccusto'] },
  { key: 'contaContabil', label: 'Conta Contábil', group: 'Identificação', type: 'text', required: false, aliases: ['conta contabil', 'conta contábil', 'conta', 'account', 'gl account', 'plano de contas'] },
  { key: 'projeto', label: 'Projeto', group: 'Identificação', type: 'text', required: false, aliases: ['projeto', 'project', 'obra', 'iniciativa'] },
  { key: 'fornecedor', label: 'Fornecedor', group: 'Identificação', type: 'text', required: false, aliases: ['fornecedor', 'supplier', 'vendor', 'credor', 'parceiro'] },
  { key: 'cliente', label: 'Cliente', group: 'Identificação', type: 'text', required: false, aliases: ['cliente', 'customer', 'comprador'] },
  { key: 'documento', label: 'Documento', group: 'Identificação', type: 'text', required: false, aliases: ['documento', 'doc', 'document', 'numero doc', 'nº doc'] },
  { key: 'notaFiscal', label: 'Nota Fiscal', group: 'Identificação', type: 'text', required: false, aliases: ['nota fiscal', 'nf', 'nfe', 'nfe', 'invoice', 'numero nf', 'nº nf'] },
  { key: 'responsavel', label: 'Responsável', group: 'Identificação', type: 'text', required: false, aliases: ['responsavel', 'responsável', 'owner', 'solicitante', 'usuario', 'usuário'] },
  { key: 'data', label: 'Data', group: 'Datas', type: 'date', required: true, aliases: ['data', 'date', 'data movimento', 'data emissao', 'data emissão', 'emissao', 'emissão', 'vencimento'] },
  { key: 'categoria', label: 'Categoria', group: 'Classificação', type: 'text', required: false, aliases: ['categoria', 'category', 'tipo despesa', 'rubrica', 'classe'] },
  { key: 'grupo', label: 'Grupo', group: 'Classificação', type: 'text', required: false, aliases: ['grupo', 'group', 'familia', 'família'] },
  { key: 'subgrupo', label: 'Subgrupo', group: 'Classificação', type: 'text', required: false, aliases: ['subgrupo', 'sub grupo', 'subgroup', 'subfamilia', 'subfamília'] },
  { key: 'tipoMovimento', label: 'Tipo de Movimento', group: 'Classificação', type: 'text', required: false, aliases: ['tipo movimento', 'tipo mov', 'tipo', 'movement type', 'natureza'] },
  { key: 'valor', label: 'Valor', group: 'Valores', type: 'currency', required: true, aliases: ['valor', 'vlr', 'value', 'amount', 'vlr total', 'valor total', 'total', 'montante', 'r$', 'valor liquido', 'valor líquido'] },
  { key: 'quantidade', label: 'Quantidade', group: 'Valores', type: 'number', required: false, aliases: ['quantidade', 'qtd', 'qty', 'quantity', 'qtdade', 'volume'] },
  { key: 'status', label: 'Status', group: 'Metadados', type: 'text', required: false, aliases: ['status', 'situacao', 'situação', 'state'] },
  { key: 'budget', label: 'Budget', group: 'Orçamento', type: 'currency', required: false, aliases: ['budget', 'orcado', 'orçado', 'budget', 'planejado', 'previsto', 'budget'] },
  { key: 'realizado', label: 'Realizado', group: 'Orçamento', type: 'currency', required: false, aliases: ['realizado', 'real', 'atual', 'ytd', 'actual'] },
  { key: 'forecast', label: 'Forecast', group: 'Orçamento', type: 'currency', required: false, aliases: ['forecast', 'previsto', 'projecao', 'projeção', 'fcst'] },
  { key: 'depreciacao', label: 'Depreciação', group: 'Valores', type: 'currency', required: false, aliases: ['depreciacao', 'depreciação', 'depreciation', 'dep'] },
  { key: 'imobilizado', label: 'Imobilizado', group: 'Valores', type: 'boolean', required: false, aliases: ['imobilizado', 'imobilizada', 'fixed asset', 'ativo imobilizado'] },
  { key: 'sourceFile', label: 'Arquivo de Origem', group: 'Metadados', type: 'text', required: false, aliases: ['source file', 'arquivo', 'fonte', 'origem'] },
];

export const FIELD_BY_KEY = new Map(FIELD_CATALOG.map((f) => [f.key, f]));

export const FIELD_OPTIONS = FIELD_CATALOG.map((f) => ({ label: f.label, value: f.key as string }));

export const TIPO_MOVIMENTO_VALUES: TipoMovimento[] = ['CAPEX', 'OPEX', 'RECEITA', 'DESPESA', 'OUTRO'];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestField(columnName: string): string | undefined {
  const col = normalize(columnName);
  if (!col) return undefined;
  let best: { key: string; score: number } | null = null;
  for (const field of FIELD_CATALOG) {
    const fieldNorm = normalize(field.label);
    let score = 0;
    if (col === fieldNorm) score = 100;
    else if (col.includes(fieldNorm) || fieldNorm.includes(col)) score = 85;
    else {
      for (const alias of field.aliases) {
        const aliasNorm = normalize(alias);
        if (col === aliasNorm) { score = Math.max(score, 95); break; }
        if (col.includes(aliasNorm) || aliasNorm.includes(col)) { score = Math.max(score, 75); break; }
        const tokens = aliasNorm.split(' ').filter((t) => t.length > 2);
        const colTokens = col.split(' ').filter((t) => t.length > 2);
        const overlap = colTokens.filter((t) => aliasNorm.includes(t)).length;
        if (overlap > 0) score = Math.max(score, 40 + overlap * 10);
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { key: field.key as string, score };
  }
  return best && best.score >= 40 ? best.key : undefined;
}

export function detectColumnType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';
  const sample = nonNull.slice(0, 200);

  const dateCount = sample.filter((v) => {
    if (v instanceof Date) return true;
    if (typeof v === 'number' && v > 20000 && v < 60000) return true;
    if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v);
    return false;
  }).length;
  if (dateCount / sample.length > 0.7) return 'date';

  const boolCount = sample.filter((v) => {
    const s = String(v).toLowerCase().trim();
    return ['sim', 'não', 'nao', 'true', 'false', '1', '0', 'yes', 'no', 'x', '-'].includes(s);
  }).length;
  if (boolCount / sample.length > 0.9 && sample.length > 2) return 'boolean';

  const numCount = sample.filter((v) => {
    if (typeof v === 'number') return true;
    const s = String(v).replace(/\s/g, '').replace(/[R$]/g, '').replace(/\./g, '').replace(',', '.');
    return s !== '' && !isNaN(Number(s));
  }).length;

  if (numCount / sample.length > 0.7) {
    const currencyHints = sample.filter((v) => {
      const s = String(v);
      return /R\$|r\$|€|\$|usd|eur|brl/i.test(s) || /\.\d{3},\d{2}/.test(s) || /\d,\d{2}$/.test(s);
    }).length;
    const pctHints = sample.filter((v) => /%/.test(String(v))).length;
    if (pctHints / sample.length > 0.5) return 'percent';
    if (currencyHints / sample.length > 0.3) return 'currency';
    return 'number';
  }

  return 'text';
}
