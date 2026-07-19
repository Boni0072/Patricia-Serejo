import { useState } from 'react';
import {
  Database, UploadCloud, Cloud, History, Trash2, FileSpreadsheet,
  Settings2, ExternalLink, CheckCircle2, Clock, XCircle, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ImportExcelCsv } from './import/ImportExcelCsv';
import { BigQueryConfigModal } from './BigQueryConfigModal';
import { useDataSourcesStore, type DataSourceStatus, type ModuleDataSourceType } from '../store/dataSources';
import { DATA_MODULES } from '../lib/modules';
import { cn } from '../lib/format';

function StatusBadge({ status }: { status: DataSourceStatus }) {
  const config: Record<DataSourceStatus, { tone: 'success' | 'neutral' | 'warning' | 'info' | 'danger'; label: string; icon: typeof CheckCircle2 }> = {
    ativo: { tone: 'success', label: 'Ativo', icon: CheckCircle2 },
    nao_configurado: { tone: 'neutral', label: 'Não configurado', icon: XCircle },
    configurado_aguardando: { tone: 'warning', label: 'Aguardando backend', icon: Clock },
    erro: { tone: 'danger', label: 'Erro', icon: XCircle },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium',
      c.tone === 'success' && 'bg-success/15 text-success',
      c.tone === 'neutral' && 'bg-content-muted/15 text-content-muted',
      c.tone === 'warning' && 'bg-warning/15 text-warning',
      c.tone === 'danger' && 'bg-danger/15 text-danger',
    )}>
      <Icon size={11} />
      {c.label}
    </span>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

const SOURCE_OPTIONS: { value: ModuleDataSourceType; label: string; icon: typeof Database; desc: string; color: string }[] = [
  { value: 'mock', label: 'Mock', icon: Database, desc: 'Dados simulados', color: 'text-content-muted' },
  { value: 'excel', label: 'Excel / CSV', icon: FileSpreadsheet, desc: 'Arquivo importado', color: 'text-success' },
  { value: 'bigquery', label: 'BigQuery', icon: Cloud, desc: 'Google Cloud', color: 'text-info' },
];

export function FontesTab() {
  const [importOpen, setImportOpen] = useState(false);
  const [bqOpen, setBqOpen] = useState(false);
  const [bqModule, setBqModule] = useState<{ id: string; label: string } | null>(null);
  const navigate = useNavigate();
  const {
    excelStatus,
    excelLastImportAt,
    bigQueryStatus,
    bigQuery,
    history,
    importedRecords,
    clearImports,
    removeHistoryEntry,
    moduleSources,
    setModuleSource,
  } = useDataSourcesStore();

  const openBqForModule = (id: string, label: string) => {
    setBqModule({ id, label });
    setBqOpen(true);
  };

  const closeBq = () => {
    setBqOpen(false);
    setBqModule(null);
  };

  const handleSourceChange = (moduleId: string, moduleLabel: string, next: ModuleDataSourceType) => {
    const existing = moduleSources[moduleId];
    if (next === 'bigquery') {
      setModuleSource(moduleId, { type: 'bigquery', bigQuery: existing?.bigQuery });
      if (!existing?.bigQuery) openBqForModule(moduleId, moduleLabel);
      return;
    }
    setModuleSource(moduleId, { type: next, bigQuery: existing?.bigQuery });
  };

  return (
    <div className="space-y-4">
      {/* Fontes globais */}
      <Card padding="md">
        <CardHeader
          title="Fontes de dados conectadas"
          subtitle="Gerencie as origens de dados do sistema. Importe arquivos ou configure conexões externas."
        />
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-page border border-border-subtle hover:border-border transition-colors">
            <div className="h-10 w-10 rounded-lg bg-accent/10 grid place-items-center shrink-0">
              <Database size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content">Dataset Mock (v1)</p>
              <p className="text-xs text-content-muted">
                Dados simulados gerados internamente ·{' '}
                {importedRecords.length === 0 ? 'base atual' : `${importedRecords.length} registros importados somados`}
              </p>
            </div>
            <StatusBadge status="ativo" />
          </div>

          <button
            onClick={() => setImportOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-page border border-border-subtle hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-lg bg-success/10 grid place-items-center shrink-0">
              <UploadCloud size={18} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content">Excel / CSV</p>
              <p className="text-xs text-content-muted">
                {excelLastImportAt
                  ? `Última importação: ${formatDateTime(excelLastImportAt)} · ${importedRecords.length} registros`
                  : 'Upload de arquivos .xlsx, .xls e .csv (até 50MB) com mapeamento automático de colunas'}
              </p>
            </div>
            <StatusBadge status={excelStatus} />
            <div className="flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              {excelStatus === 'ativo' ? 'Nova importação' : 'Configurar'}
              <Settings2 size={13} />
            </div>
          </button>

          <button
            onClick={() => setBqOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-page border border-border-subtle hover:border-info/50 hover:bg-info/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-lg bg-info/10 grid place-items-center shrink-0">
              <Cloud size={18} className="text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content">BigQuery</p>
              <p className="text-xs text-content-muted">
                {bigQuery
                  ? `${bigQuery.projectId} · ${bigQuery.dataset}.${bigQuery.table}`
                  : 'Google Cloud BigQuery — requer backend (Edge Function) para conexão efetiva'}
              </p>
            </div>
            <StatusBadge status={bigQueryStatus} />
            <div className="flex items-center gap-1 text-xs text-info opacity-0 group-hover:opacity-100 transition-opacity">
              {bigQuery ? 'Editar' : 'Configurar'}
              <Settings2 size={13} />
            </div>
          </button>
        </div>
      </Card>

      {/* Registros importados */}
      {importedRecords.length > 0 && (
        <Card padding="md">
          <CardHeader
            title="Registros importados"
            subtitle="Dados carregados via Excel/CSV que complementam o dataset mock"
            action={
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Trash2 size={14} />}
                onClick={() => {
                  if (confirm('Remover todos os registros importados? O dataset voltará a usar apenas os dados mock.')) {
                    clearImports();
                  }
                }}
              >
                Limpar importações
              </Button>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Registros', value: importedRecords.length.toLocaleString('pt-BR') },
              { label: 'Empresas', value: new Set(importedRecords.map((r) => r.empresa)).size },
              { label: 'Arquivos', value: new Set(importedRecords.map((r) => r.sourceFile)).size },
              { label: 'Última', value: excelLastImportAt ? formatDateTime(excelLastImportAt) : '—' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-lg bg-page border border-border-subtle">
                <p className="text-[11px] text-content-muted uppercase tracking-wide">{kpi.label}</p>
                <p className="text-xl font-bold text-content tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fonte por módulo — cards */}
      <Card padding="md">
        <CardHeader
          title="Fonte de dados por módulo"
          subtitle="Selecione a origem dos dados para cada página. A mudança é aplicada imediatamente."
          action={<Badge tone="info">{DATA_MODULES.length} módulos</Badge>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {DATA_MODULES.map((m) => {
            const src = moduleSources[m.id] ?? { type: 'mock' as ModuleDataSourceType };
            const Icon = m.icon;
            const hasBqConfig = !!src.bigQuery;
            return (
              <div
                key={m.id}
                className="group flex flex-col gap-3 p-4 rounded-xl border border-border-subtle bg-page hover:border-border transition-colors"
              >
                {/* cabeçalho do card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-8 w-8 rounded-lg bg-accent/10 grid place-items-center shrink-0">
                      <Icon size={15} className="text-accent" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-content truncate">{m.label}</p>
                      <p className="text-[11px] text-content-muted truncate">{m.hint}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(m.path)}
                    aria-label={`Abrir ${m.label}`}
                    className="h-7 w-7 rounded-lg grid place-items-center text-content-muted hover:text-accent hover:bg-accent/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>

                {/* seletor de fonte */}
                <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-surface p-1">
                  {SOURCE_OPTIONS.map((opt) => {
                    const active = src.type === opt.value;
                    const SrcIcon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSourceChange(m.id, m.label, opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] font-medium transition-all',
                          active
                            ? 'bg-surface-card shadow-sm text-content ring-1 ring-border'
                            : 'text-content-muted hover:text-content hover:bg-surface-hover',
                        )}
                      >
                        <SrcIcon size={14} className={active ? opt.color : 'text-content-muted'} />
                        <span className="leading-tight text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ação extra por tipo de fonte */}
                {src.type === 'mock' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface border border-border-subtle text-xs text-content-muted">
                    <Database size={12} className="shrink-0 text-content-muted" />
                    Usando dados simulados internos. Nenhuma configuração necessária.
                  </div>
                )}
                {src.type === 'excel' && (
                  <button
                    onClick={() => setImportOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors border border-success/30 bg-success/5 text-success hover:bg-success/10"
                  >
                    <UploadCloud size={12} />
                    {importedRecords.length > 0 ? `${importedRecords.length.toLocaleString('pt-BR')} registros importados · Nova importação` : 'Importar arquivo Excel / CSV'}
                  </button>
                )}
                {src.type === 'bigquery' && (
                  <button
                    onClick={() => openBqForModule(m.id, m.label)}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      hasBqConfig
                        ? 'border-info/30 bg-info/5 text-info hover:bg-info/10'
                        : 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 animate-pulse',
                    )}
                  >
                    <Settings2 size={12} />
                    {hasBqConfig ? 'Editar configuração BigQuery' : 'Configurar BigQuery (obrigatório)'}
                  </button>
                )}

                {/* status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-content-muted uppercase tracking-wide">Fonte ativa</span>
                  {src.type === 'bigquery' && hasBqConfig && <Badge tone="info">BigQuery</Badge>}
                  {src.type === 'bigquery' && !hasBqConfig && <Badge tone="warning">Sem config</Badge>}
                  {src.type === 'excel' && <Badge tone="success">Excel / CSV</Badge>}
                  {src.type === 'mock' && <Badge tone="neutral">Mock</Badge>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-content-muted">
          <ChevronRight size={13} />
          Cada módulo pode ter fonte independente. A mudança é aplicada imediatamente nas páginas.
        </p>
      </Card>

      {/* Histórico */}
      <Card padding="md">
        <CardHeader
          title="Histórico de importações"
          subtitle="Registro de todas as importações realizadas"
          action={<Badge tone="info">{history.length} {history.length === 1 ? 'registro' : 'registros'}</Badge>}
        />
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-content-muted/10 grid place-items-center mb-3">
              <History size={22} className="text-content-muted" />
            </div>
            <p className="text-sm text-content-muted">Nenhuma importação realizada ainda.</p>
            <Button variant="secondary" size="sm" leftIcon={<UploadCloud size={14} />} onClick={() => setImportOpen(true)} className="mt-3">
              Importar primeiro arquivo
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-surface">
                <tr>
                  {['Arquivo', 'Data/Hora', 'Usuário', 'Linhas', 'Modo', 'Status', ''].map((h, i) => (
                    <th key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2.5 border-b border-border-subtle whitespace-nowrap ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors group">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-success shrink-0" />
                        <span className="text-content truncate max-w-[200px]">{h.fileName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-content-muted whitespace-nowrap text-xs">{formatDateTime(h.importedAt)}</td>
                    <td className="px-3 py-2.5 text-content-muted whitespace-nowrap">{h.importedBy}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-content font-medium whitespace-nowrap">{h.rowCount.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone={h.mode === 'replace' ? 'warning' : 'info'}>
                        {h.mode === 'replace' ? 'Substituiu' : 'Adicionou'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone={h.status === 'success' ? 'success' : h.status === 'partial' ? 'warning' : 'danger'}>
                        {h.status === 'success' ? 'Sucesso' : h.status === 'partial' ? 'Parcial' : 'Falha'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => removeHistoryEntry(h.id)}
                        aria-label="Remover do histórico"
                        className="h-7 w-7 rounded-lg grid place-items-center text-content-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-info/5 border border-info/20">
        <ExternalLink size={15} className="text-info shrink-0 mt-0.5" />
        <p className="text-xs text-content-muted leading-relaxed">
          A etapa de mapeamento de colunas é isolada e independente da origem dos dados, permitindo
          o reaproveitamento tanto para Excel/CSV quanto para BigQuery e outras fontes.
        </p>
      </div>

      <ImportExcelCsv open={importOpen} onClose={() => setImportOpen(false)} />
      <BigQueryConfigModal
        open={bqOpen}
        onClose={closeBq}
        moduleId={bqModule?.id}
        moduleLabel={bqModule?.label}
      />
    </div>
  );
}
