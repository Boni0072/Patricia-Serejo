import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FactRecord } from '../types';

export interface ImportHistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  importedAt: string;
  importedBy: string;
  rowCount: number;
  mode: 'replace' | 'append';
  status: 'success' | 'partial' | 'failed';
  notes?: string;
}

export interface BigQueryConfig {
  projectId: string;
  dataset: string;
  table: string;
  authMethod: 'service_account' | 'oauth';
  serviceAccountKey?: string;
  oauthClientEmail?: string;
  savedAt?: string;
}

export type DataSourceStatus = 'ativo' | 'nao_configurado' | 'configurado_aguardando' | 'erro';

export type ModuleDataSourceType = 'mock' | 'excel' | 'bigquery';

export interface ModuleDataSource {
  type: ModuleDataSourceType;
  bigQuery?: BigQueryConfig;
}

interface DataSourcesState {
  importedRecords: FactRecord[];
  history: ImportHistoryEntry[];
  bigQuery: BigQueryConfig | null;
  excelStatus: DataSourceStatus;
  excelLastImportAt: string | null;
  bigQueryStatus: DataSourceStatus;
  moduleSources: Record<string, ModuleDataSource>;

  commitImport: (records: FactRecord[], mode: 'replace' | 'append', entry: Omit<ImportHistoryEntry, 'id'>) => void;
  clearImports: () => void;
  removeHistoryEntry: (id: string) => void;
  saveBigQuery: (config: BigQueryConfig) => void;
  clearBigQuery: () => void;
  setModuleSource: (moduleId: string, source: ModuleDataSource) => void;
  getModuleSource: (moduleId: string) => ModuleDataSource;
}

export const useDataSourcesStore = create<DataSourcesState>()(
  persist(
    (set) => ({
      importedRecords: [],
      history: [],
      bigQuery: null,
      excelStatus: 'nao_configurado',
      excelLastImportAt: null,
      bigQueryStatus: 'nao_configurado',
      moduleSources: {},

      commitImport: (records, mode, entry) =>
        set((state) => {
          const id = `hist-${Date.now()}`;
          const newRecords = mode === 'replace' ? records : [...state.importedRecords, ...records];
          return {
            importedRecords: newRecords,
            excelStatus: 'ativo',
            excelLastImportAt: entry.importedAt,
            history: [{ ...entry, id }, ...state.history].slice(0, 50),
          };
        }),

      clearImports: () =>
        set({ importedRecords: [], excelStatus: 'nao_configurado', excelLastImportAt: null }),

      removeHistoryEntry: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),

      saveBigQuery: (config) =>
        set({ bigQuery: { ...config, savedAt: new Date().toISOString() }, bigQueryStatus: 'configurado_aguardando' }),

      clearBigQuery: () =>
        set({ bigQuery: null, bigQueryStatus: 'nao_configurado' }),

      setModuleSource: (moduleId, source) =>
        set((state) => ({ moduleSources: { ...state.moduleSources, [moduleId]: source } })),

      getModuleSource: (moduleId) => {
        const state = useDataSourcesStore.getState();
        return state.moduleSources[moduleId] ?? { type: 'mock' as ModuleDataSourceType };
      },
    }),
    { name: 'controladoria-data-sources' },
  ),
);
