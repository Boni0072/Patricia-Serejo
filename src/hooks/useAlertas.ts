import { useMemo } from 'react';
import type { Alerta } from '../types';
import { useDataset } from './useDataset';
import { useFiltersStore } from '../store/filters';
import { applyFilters, buildAlertas, DEFAULT_THRESHOLDS } from '../lib/kpi';

export function useAlertas() {
  const { data: records, isLoading } = useDataset();
  const filters = useFiltersStore();

  const alertas = useMemo<Alerta[]>(() => {
    if (!records) return [];
    const filtered = applyFilters(records, filters);
    return buildAlertas(filtered, DEFAULT_THRESHOLDS);
  }, [records, filters]);

  const naoLidos = useMemo(() => alertas.filter((a) => !a.lido).length, [alertas]);
  const criticos = useMemo(() => alertas.filter((a) => a.severidade === 'critico').length, [alertas]);

  return { alertas, naoLidos, criticos, isLoading };
}
