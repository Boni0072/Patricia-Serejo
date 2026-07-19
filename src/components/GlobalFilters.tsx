import { useMemo } from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { useFiltersStore, FILTER_KEYS } from '../store/filters';
import { useDataset } from '../hooks/useDataset';
import { MOCK_CATEGORIAS, MOCK_CENTROS_CUSTO, MOCK_FORNECEDORES, MOCK_LOJAS, MOCK_EMPRESAS } from '../lib/mockData';
import { monthFullLabel } from '../lib/format';

export function GlobalFilters() {
  const filters = useFiltersStore();
  const { data: records } = useDataset();

  const anos = useMemo(() => {
    const set = new Set<number>();
    records?.forEach((r) => set.add(r.ano));
    return Array.from(set).sort((a, b) => b - a);
  }, [records]);

  const empresasOpts = MOCK_EMPRESAS.map((e) => ({ label: e.nome, value: e.nome }));
  const lojasOpts = MOCK_LOJAS.map((l) => ({ label: l, value: l }));
  const centrosOpts = MOCK_CENTROS_CUSTO.map((c) => ({ label: c, value: c }));
  const fornecedoresOpts = MOCK_FORNECEDORES.map((f) => ({ label: f, value: f }));
  const categoriasOpts = MOCK_CATEGORIAS.map((c) => ({ label: c, value: c }));
  const anosOpts = anos.map((a) => ({ label: String(a), value: a }));
  const mesesOpts = Array.from({ length: 12 }, (_, i) => ({ label: monthFullLabel(i + 1), value: i + 1 }));
  const statusOpts = ['Aprovado', 'Pendente', 'Conciliado', 'Em Análise'].map((s) => ({ label: s, value: s }));

  const activeCount = (Object.keys(filters) as (keyof typeof filters)[])
    .filter((k) => (FILTER_KEYS as readonly string[]).includes(k) && filters[k] != null && filters[k] !== '').length;

  return (
    <div className="card-base p-3 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={15} className="text-content-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">Filtros globais</span>
        {activeCount > 0 && (
          <span className="text-[10px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">{activeCount} ativos</span>
        )}
        <div className="flex-1" />
        {activeCount > 0 && (
          <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={13} />} onClick={() => filters.reset()}>
            Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        <Select ariaLabel="Empresa" placeholder="Empresa" value={filters.empresa} onChange={(v) => filters.set({ empresa: v as string })} options={empresasOpts} clearable />
        <Select ariaLabel="Loja" placeholder="Loja" value={filters.loja} onChange={(v) => filters.set({ loja: v as string })} options={lojasOpts} clearable />
        <Select ariaLabel="Centro de custo" placeholder="Centro de custo" value={filters.centroCusto} onChange={(v) => filters.set({ centroCusto: v as string })} options={centrosOpts} clearable />
        <Select ariaLabel="Fornecedor" placeholder="Fornecedor" value={filters.fornecedor} onChange={(v) => filters.set({ fornecedor: v as string })} options={fornecedoresOpts} clearable />
        <Select ariaLabel="Categoria" placeholder="Categoria" value={filters.categoria} onChange={(v) => filters.set({ categoria: v as string })} options={categoriasOpts} clearable />
        <Select ariaLabel="Ano" placeholder="Ano" value={filters.ano} onChange={(v) => filters.set({ ano: v as number })} options={anosOpts} />
        <Select ariaLabel="Mês" placeholder="Mês" value={filters.mes} onChange={(v) => filters.set({ mes: v as number })} options={mesesOpts} clearable />
        <Select ariaLabel="Status" placeholder="Status" value={filters.status} onChange={(v) => filters.set({ status: v as string })} options={statusOpts} clearable />
      </div>
    </div>
  );
}

export function ActiveFiltersChips() {
  const filters = useFiltersStore();
  const chips = (Object.keys(filters) as (keyof typeof filters)[])
    .filter((k) => (FILTER_KEYS as readonly string[]).includes(k) && filters[k] != null && filters[k] !== '')
    .map((k) => ({ key: k, label: `${k}: ${filters[k]}` }));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5 text-xs bg-surface border border-border-subtle text-content-muted rounded-full pl-2.5 pr-1 py-1">
          <span className="capitalize">{c.label}</span>
          <button onClick={() => filters.set({ [c.key]: undefined } as never)} className="h-4 w-4 grid place-items-center rounded-full hover:bg-surface-hover" aria-label={`Remover filtro ${c.key}`}>
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}
