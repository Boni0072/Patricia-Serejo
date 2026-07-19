import { create } from 'zustand';
import type { FilterState } from '../lib/kpi';

interface FiltersStore extends FilterState {
  set: (patch: Partial<FilterState>) => void;
  reset: () => void;
}

export const useFiltersStore = create<FiltersStore>((set) => ({
  empresa: undefined,
  loja: undefined,
  centroCusto: undefined,
  projeto: undefined,
  fornecedor: undefined,
  categoria: undefined,
  ano: new Date().getFullYear(),
  mes: undefined,
  status: undefined,
  set: (patch) => set(patch),
  reset: () =>
    set({
      empresa: undefined, loja: undefined, centroCusto: undefined, projeto: undefined,
      fornecedor: undefined, categoria: undefined, ano: new Date().getFullYear(),
      mes: undefined, status: undefined,
    }),
}));

const FILTER_KEYS: (keyof FilterState)[] = [
  'empresa', 'loja', 'centroCusto', 'projeto', 'fornecedor', 'categoria', 'ano', 'mes', 'status',
];

export function filtersToQuery(filters: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  FILTER_KEYS.forEach((k) => {
    const v = filters[k];
    if (v != null && v !== '') sp.set(k, String(v));
  });
  return sp;
}

export function queryToFilters(sp: URLSearchParams): Partial<FilterState> {
  const out: Partial<FilterState> = {};
  FILTER_KEYS.forEach((k) => {
    const v = sp.get(k as string);
    if (v != null && v !== '') {
      if (k === 'ano' || k === 'mes') out[k] = Number(v);
      else (out as Record<string, unknown>)[k as string] = v;
    }
  });
  return out;
}

export { FILTER_KEYS };
