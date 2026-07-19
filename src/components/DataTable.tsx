import { useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Columns3, FileDown, FileText, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { exportToExcel, exportToPDF } from '../lib/export';
import type { FactRecord } from '../types';

export interface DataTableColumn {
  key: keyof FactRecord;
  header: string;
  render?: (r: FactRecord) => React.ReactNode;
  width?: number;
  align?: 'left' | 'right';
}

interface DataTableProps {
  data: FactRecord[];
  columns: DataTableColumn[];
  virtualize?: boolean;
  height?: number;
  exportName?: string;
}

export function DataTable({ data, columns, virtualize, height = 480, exportName = 'tabela' }: DataTableProps) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCols, setShowCols] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(columns.map((c) => c.key)));
  const [copied, setCopied] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const tableCols = useMemo<ColumnDef<FactRecord>[]>(() => {
    const active = columns.filter((c) => visibleCols.has(c.key));
    return [
      ...active.map((c): ColumnDef<FactRecord> => ({
        id: c.key,
        accessorKey: c.key as string,
        header: c.header,
        cell: ({ row }) => c.render ? c.render(row.original) : (row.original[c.key] ?? '—'),
        size: c.width,
      })),
    ];
  }, [columns, visibleCols]);

  const table = useReactTable({
    data,
    columns: tableCols,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: virtualize ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 12,
    enabled: virtualize,
  });

  const totalSize = virtualizer.getTotalSize();

  const copyAll = async () => {
    const header = columns.filter((c) => visibleCols.has(c.key)).map((c) => c.header).join('\t');
    const body = rows.map((r) =>
      columns.filter((c) => visibleCols.has(c.key)).map((c) => r.original[c.key] ?? '').join('\t'),
    ).join('\n');
    await navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
          <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar…" className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<FileDown size={14} />} onClick={() => exportToExcel(data, exportName)}>Excel</Button>
        <Button variant="outline" size="sm" leftIcon={<FileText size={14} />} onClick={() => exportToPDF(data, exportName)}>PDF</Button>
        <Button variant="outline" size="sm" leftIcon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyAll}>{copied ? 'Copiado' : 'Copiar'}</Button>
        <div className="relative">
          <Button variant="outline" size="sm" leftIcon={<Columns3 size={14} />} onClick={() => setShowCols((v) => !v)}>Colunas</Button>
          {showCols && (
            <div className="absolute right-0 top-full mt-1 z-40 w-52 max-h-64 overflow-y-auto rounded-lg bg-surface border border-border-subtle shadow-card-hover py-1">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-content hover:bg-surface-hover cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.key)}
                    onChange={() => setVisibleCols((s) => {
                      const n = new Set(s);
                      if (n.has(c.key)) n.delete(c.key); else n.add(c.key);
                      if (n.size === 0) n.add(c.key);
                      return n;
                    })}
                    className="accent-[rgb(var(--accent-primary))]"
                  />
                  {c.header}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-content-muted">{rows.length} de {data.length} registros</div>

      <div ref={parentRef} className="overflow-auto rounded-xl border border-border-subtle bg-surface" style={{ maxHeight: height }}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sort = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="text-left text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2.5 border-b border-border-subtle whitespace-nowrap"
                    >
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 hover:text-content"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sort === 'asc' ? <ArrowUp size={12} className="text-accent" /> : sort === 'desc' ? <ArrowDown size={12} className="text-accent" /> : <ArrowUpDown size={12} className="opacity-40" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualize ? (
              rows.length === 0 ? (
                <tr><td colSpan={tableCols.length} className="text-center py-10 text-sm text-content-muted">Nenhum registro.</td></tr>
              ) : (
                <tr style={{ height: totalSize }}>
                  <td colSpan={tableCols.length} style={{ padding: 0 }}>
                    <div style={{ height: totalSize, position: 'relative' }}>
                      {virtualizer.getVirtualItems().map((vi) => {
                        const row = rows[vi.index];
                        return (
                          <div
                            key={row.id}
                            className="absolute top-0 left-0 w-full flex items-center border-b border-border-subtle/60 hover:bg-surface-hover transition-colors"
                            style={{ height: 40, transform: `translateY(${vi.start}px)` }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <div
                                key={cell.id}
                                style={{ width: cell.column.getSize(), flex: cell.column.getSize() ? '0 0 auto' : '1' }}
                                className="px-3 text-xs text-content truncate"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )
            ) : (
              rows.length === 0 ? (
                <tr><td colSpan={tableCols.length} className="text-center py-10 text-sm text-content-muted">Nenhum registro encontrado.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 text-xs text-content whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
      {virtualize && rows.length > 0 && (
        <p className="text-[11px] text-content-muted">Virtualização ativa · {virtualizer.getVirtualItems().length} linhas renderizadas de {rows.length}.</p>
      )}
    </div>
  );
}
