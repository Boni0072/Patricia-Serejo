import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FactRecord } from '../types';
import { formatCurrency, formatDate } from './format';

const COLS: { key: keyof FactRecord; header: string }[] = [
  { key: 'data', header: 'Data' },
  { key: 'empresa', header: 'Empresa' },
  { key: 'loja', header: 'Loja' },
  { key: 'centroCusto', header: 'Centro de Custo' },
  { key: 'categoria', header: 'Categoria' },
  { key: 'fornecedor', header: 'Fornecedor' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'projeto', header: 'Projeto' },
  { key: 'documento', header: 'Documento' },
  { key: 'notaFiscal', header: 'Nota Fiscal' },
  { key: 'tipoMovimento', header: 'Tipo' },
  { key: 'status', header: 'Status' },
  { key: 'responsavel', header: 'Responsável' },
  { key: 'valor', header: 'Valor' },
  { key: 'budget', header: 'Budget' },
  { key: 'realizado', header: 'Realizado' },
  { key: 'forecast', header: 'Forecast' },
];

function toRows(records: FactRecord[]): Record<string, unknown>[] {
  return records.map((r) => {
    const o: Record<string, unknown> = {};
    COLS.forEach((c) => {
      const v = r[c.key];
      o[c.header] = c.key === 'data' ? formatDate(v as string) : c.key === 'valor' ? Number(v) : v ?? '';
    });
    return o;
  });
}

export function exportToExcel(records: FactRecord[], name: string) {
  const rows = toRows(records);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToPDF(records: FactRecord[], name: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Controladoria Executive Dashboard', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${name} — ${records.length} registros — gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [COLS.map((c) => c.header)],
    body: records.map((r) =>
      COLS.map((c) => {
        const v = r[c.key];
        if (c.key === 'valor') return formatCurrency(Number(v));
        if (c.key === 'data') return formatDate(v as string);
        return (v ?? '') as string;
      }),
    ),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [45, 212, 167], textColor: 10 },
    alternateRowStyles: { fillColor: [245, 246, 248] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${name}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
