import { useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { GlobalFilters, ActiveFiltersChips } from '../components/GlobalFilters';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { useDataset } from '../hooks/useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters } from '../lib/kpi';
import { formatCurrency, formatDate } from '../lib/format';
import type { FactRecord } from '../types';

const columns: DataTableColumn[] = [
  { key: 'data', header: 'Data', width: 110, render: (r) => formatDate(r.data) },
  { key: 'empresa', header: 'Empresa', width: 120 },
  { key: 'loja', header: 'Loja', width: 120 },
  { key: 'centroCusto', header: 'Centro Custo', width: 130 },
  { key: 'categoria', header: 'Categoria', width: 160 },
  { key: 'fornecedor', header: 'Fornecedor', width: 150, render: (r) => r.fornecedor ?? r.cliente ?? '—' },
  { key: 'projeto', header: 'Projeto', width: 130, render: (r) => r.projeto ?? '—' },
  { key: 'documento', header: 'Documento', width: 140 },
  { key: 'tipoMovimento', header: 'Tipo', width: 90, render: (r) => <Badge tone={r.tipoMovimento === 'RECEITA' ? 'success' : r.tipoMovimento === 'CAPEX' ? 'info' : 'neutral'}>{r.tipoMovimento}</Badge> },
  { key: 'status', header: 'Status', width: 110, render: (r) => <Badge tone={r.status === 'Aprovado' ? 'success' : r.status === 'Pendente' ? 'warning' : 'neutral'}>{r.status}</Badge> },
  { key: 'responsavel', header: 'Responsável', width: 130 },
  { key: 'valor', header: 'Valor', width: 130, align: 'right', render: (r) => <span className={r.valor >= 0 ? 'text-success font-semibold' : 'text-content'}>{formatCurrency(r.valor)}</span> },
];

export function LancamentosPage() {
  const { data: records, isLoading } = useDataset();
  const filters = useFiltersStore();
  const rows = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader title="Lançamentos" subtitle="Tabela fato universal com todos os registros importados. Virtualizada para datasets grandes — com export Excel/PDF, copiar, ordenar e mostrar/ocultar colunas." />
      <GlobalFilters />
      <ActiveFiltersChips />
      <Card padding="md">
        {isLoading ? (
          <div className="h-96 shimmer rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <FileSpreadsheet size={32} className="mx-auto mb-3 text-content-muted opacity-40" />
            <p className="text-sm text-content">Nenhum lançamento para os filtros selecionados.</p>
          </div>
        ) : (
          <DataTable data={rows} columns={columns} virtualize height={600} exportName="lancamentos" />
        )}
      </Card>
    </div>
  );
}
