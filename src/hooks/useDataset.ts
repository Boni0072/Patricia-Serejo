import { useQuery } from '@tanstack/react-query';
import { generateMockDataset } from '../lib/mockData';
import { useDataSourcesStore } from '../store/dataSources';
import type { FactRecord } from '../types';
import { DATA_MODULES } from '../lib/modules';

const ROUTE_TO_MODULE: Record<string, string> = Object.fromEntries(
  DATA_MODULES.map((m) => [m.path === '/' ? 'dashboard' : m.path.slice(1), m.id]),
);

function resolveModuleId(moduleId?: string): string | undefined {
  if (moduleId) return moduleId;
  if (typeof window === 'undefined') return undefined;
  const path = window.location.pathname;
  const key = path === '/' ? 'dashboard' : path.slice(1).split('/')[0];
  return ROUTE_TO_MODULE[key];
}

export function useDataset(moduleId?: string) {
  const importedRecords = useDataSourcesStore((s) => s.importedRecords);
  const excelStatus = useDataSourcesStore((s) => s.excelStatus);
  const moduleSources = useDataSourcesStore((s) => s.moduleSources);
  const resolvedId = resolveModuleId(moduleId);
  const source = resolvedId ? moduleSources[resolvedId] : undefined;
  const sourceType = source?.type ?? 'mock';

  return useQuery<FactRecord[]>({
    queryKey: ['dataset', resolvedId ?? 'global', sourceType, importedRecords.length, excelStatus],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 550));
      const mock = generateMockDataset();
      const imported = importedRecords;
      switch (sourceType) {
        case 'bigquery':
          return imported;
        case 'excel':
          return imported.length > 0 ? imported : mock;
        case 'mock':
        default:
          return imported.length > 0 ? [...imported, ...mock] : mock;
      }
    },
    staleTime: Infinity,
  });
}
