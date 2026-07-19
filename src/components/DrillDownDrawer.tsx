import { useMemo, useState } from 'react';
import { Drawer } from './ui/Drawer';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DataTable } from './DataTable';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters } from '../lib/kpi';
import { formatCurrency, formatDate } from '../lib/format';
import { Search, FileText, FileDown } from 'lucide-react';
import type { FactRecord } from '../types';

interface DrillDownDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  // filtro extra específico do drill-down (ex.: categoria='Energia')
  filter?: Partial<FactRecord>;
}

export function DrillDownDrawer({ open, onClose, title, subtitle, filter = {} }: DrillDownDrawerProps) {
  const { data: records } = useDataset();
  const globalFilters = useFiltersStore();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!records) return [];
    let list = applyFilters(records, globalFilters);
    list = list.filter((r) =>
      Object.entries(filter).every(([k, v]) => r[k as keyof FactRecord] === v),
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.documento, r.notaFiscal, r.fornecedor, r.cliente, r.categoria, r.responsavel, r.centroCusto]
          .filter(Boolean).some((x) => (x as string).toLowerCase().includes(q)),
      );
    }
    return list;
  }, [records, globalFilters, filter, search]);

  const columns = useMemo(
    () => [
      { key: 'data' as keyof FactRecord, header: 'Data', render: (r: FactRecord) => formatDate(r.data), width: 110 },
      { key: 'empresa' as keyof FactRecord, header: 'Empresa', width: 120 },
      { key: 'categoria' as keyof FactRecord, header: 'Categoria', width: 150 },
      { key: 'fornecedor' as keyof FactRecord, header: 'Fornecedor/Cliente', render: (r: FactRecord) => r.fornecedor ?? r.cliente ?? '—', width: 150 },
      { key: 'tipoMovimento' as keyof FactRecord, header: 'Tipo', render: (r: FactRecord) => <Badge tone={r.tipoMovimento === 'RECEITA' ? 'success' : r.tipoMovimento === 'CAPEX' ? 'info' : 'neutral'}>{r.tipoMovimento}</Badge>, width: 100 },
      { key: 'status' as keyof FactRecord, header: 'Status', render: (r: FactRecord) => <Badge tone={r.status === 'Aprovado' ? 'success' : r.status === 'Pendente' ? 'warning' : 'neutral'}>{r.status}</Badge>, width: 110 },
      { key: 'valor' as keyof FactRecord, header: 'Valor', align: 'right' as const, render: (r: FactRecord) => <span className={r.valor >= 0 ? 'text-success' : 'text-content'}>{formatCurrency(r.valor)}</span>, width: 130 },
    ],
    [],
  );

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle} width={720}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar documento, fornecedor, categoria…" className="pl-9" />
          </div>
          <Button variant="outline" size="icon" aria-label="Exportar Excel" onClick={() => import('../lib/export').then((m) => m.exportToExcel(rows, 'drill-down'))}>
            <FileDown size={16} />
          </Button>
          <Button variant="outline" size="icon" aria-label="Exportar PDF" onClick={() => import('../lib/export').then((m) => m.exportToPDF(rows, 'drill-down'))}>
            <FileText size={16} />
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-content-muted">
          <span>{rows.length} lançamentos</span>
          <span>Total: <strong className={rows.reduce((a, r) => a + r.valor, 0) >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(rows.reduce((a, r) => a + r.valor, 0))}</strong></span>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-content-muted">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            Nenhum lançamento encontrado para este detalhamento.
          </div>
        ) : (
          <DataTable data={rows} columns={columns} virtualize height={420} />
        )}
      </div>
    </Drawer>
  );
}
