import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Database } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ColumnMapper } from './ColumnMapper';
import { validateFile, parseFile, MAX_FILE_SIZE, ACCEPTED_EXTENSIONS, type ParsedFile } from '../../lib/fileParser';
import { validateImport, buildFactRecords, type ColumnMapping, type ValidationReport } from '../../lib/importValidation';
import { suggestField, type ColumnType } from '../../lib/importTypes';
import { useDataSourcesStore } from '../../store/dataSources';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/format';

type Step = 'upload' | 'preview' | 'mapping' | 'validation' | 'confirm';

interface ImportExcelCsvProps {
  open: boolean;
  onClose: () => void;
}

export function ImportExcelCsv({ open, onClose }: ImportExcelCsvProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [includeErrors, setIncludeErrors] = useState(false);
  const [committed, setCommitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { commitImport } = useDataSourcesStore();
  const { user } = useAuth();

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsed(null);
    setMapping({});
    setReport(null);
    setParsing(false);
    setError(null);
    setDragOver(false);
    setImportMode('append');
    setIncludeErrors(false);
    setCommitted(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    const validation = validateFile(f);
    if (!validation.ok) {
      setError(validation.error ?? 'Arquivo inválido');
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const result = await parseFile(f);
      if (result.rowCount === 0) {
        setError('Arquivo não contém linhas de dados');
        setParsing(false);
        return;
      }
      setParsed(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const proceedToMapping = () => {
    if (!parsed) return;
    const initial: ColumnMapping = {};
    parsed.columns.forEach((c) => {
      const s = suggestField(c.name);
      if (s) initial[c.name] = s;
    });
    setMapping(initial);
    setStep('mapping');
  };

  const runValidation = () => {
    if (!parsed) return;
    const columnTypes: Record<string, ColumnType> = {};
    parsed.columns.forEach((c) => { columnTypes[c.name] = c.type; });
    const r = validateImport(parsed, mapping, columnTypes);
    setReport(r);
    setStep('validation');
  };

  const doImport = () => {
    if (!parsed || !report) return;
    const records = buildFactRecords(report, includeErrors, parsed.fileName);
    const status: 'success' | 'partial' = report.invalid > 0 && !includeErrors ? 'partial' : 'success';
    commitImport(records, importMode, {
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      importedAt: new Date().toISOString(),
      importedBy: user?.email ?? 'Sistema',
      rowCount: records.length,
      mode: importMode,
      status,
      notes: status === 'partial' ? `${report.invalid} linhas inválidas descartadas` : undefined,
    });
    setCommitted(true);
    setStep('confirm');
  };

  const stepIndex = ['upload', 'preview', 'mapping', 'validation', 'confirm'].indexOf(step);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importar Excel / CSV"
      subtitle="Carregue um arquivo e mapeie as colunas para o formato do sistema."
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {['Upload', 'Prévia', 'Mapeamento', 'Validação', 'Confirmação'].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    i <= stepIndex ? 'bg-accent' : 'bg-content-muted/30',
                  )}
                />
                <span className={cn('text-[10px] uppercase tracking-wide hidden sm:inline', i === stepIndex ? 'text-content font-medium' : 'text-content-muted')}>{label}</span>
                {i < 4 && <div className={cn('w-3 h-px', i < stepIndex ? 'bg-accent' : 'bg-content-muted/20')} />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'upload' && step !== 'confirm' && (
              <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} onClick={() => {
                if (step === 'preview') { setStep('upload'); }
                else if (step === 'mapping') { setStep('preview'); }
                else if (step === 'validation') { setStep('mapping'); }
              }}>
                Voltar
              </Button>
            )}
            {step === 'preview' && (
              <Button variant="primary" rightIcon={<ArrowRight size={15} />} onClick={proceedToMapping}>
                Mapear colunas
              </Button>
            )}
            {step === 'mapping' && (
              <Button variant="primary" rightIcon={<ArrowRight size={15} />} onClick={runValidation} disabled={Object.values(mapping).filter(Boolean).length === 0}>
                Validar dados
              </Button>
            )}
            {step === 'validation' && report && (
              <Button variant="primary" rightIcon={<ArrowRight size={15} />} onClick={doImport} disabled={report.valid === 0 && !includeErrors}>
                Importar {report.valid} {includeErrors ? report.total : report.valid} {report.valid === 1 ? 'registro' : 'registros'}
              </Button>
            )}
            {step === 'confirm' && (
              <Button variant="primary" onClick={handleClose}>Concluir</Button>
            )}
            {step === 'upload' && (
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
            )}
          </div>
        </div>
      }
    >
      {step === 'upload' && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              dragOver ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border-subtle hover:border-content-muted/40 hover:bg-surface-hover',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={onFileInput}
              className="hidden"
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-accent animate-spin" />
                <p className="text-sm text-content">Processando arquivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-accent/10 grid place-items-center">
                  <UploadCloud size={26} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-content">Arraste um arquivo ou clique para selecionar</p>
                  <p className="text-xs text-content-muted mt-1">Formatos aceitos: .xlsx, .xls, .csv · Limite de 50MB</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-danger/10 border border-danger/30">
              <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {file && !error && !parsing && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-surface border border-border-subtle">
              <FileSpreadsheet size={18} className="text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content truncate">{file.name}</p>
                <p className="text-[11px] text-content-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: UploadCloud, title: '1. Upload', desc: 'Selecione ou arraste o arquivo' },
              { icon: FileSpreadsheet, title: '2. Mapeamento', desc: 'Associe colunas aos campos' },
              { icon: CheckCircle2, title: '3. Validação', desc: 'Revise e confirme a importação' },
            ].map((s) => (
              <div key={s.title} className="p-3 rounded-lg bg-page border border-border-subtle">
                <s.icon size={16} className="text-accent mb-2" />
                <p className="text-xs font-medium text-content">{s.title}</p>
                <p className="text-[11px] text-content-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'preview' && parsed && (
        <div>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface border border-border-subtle">
            <FileSpreadsheet size={18} className="text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-content truncate">{parsed.fileName}</p>
              <p className="text-[11px] text-content-muted">{parsed.rowCount.toLocaleString('pt-BR')} linhas · {parsed.columns.length} colunas · {(parsed.fileSize / 1024).toFixed(1)} KB</p>
            </div>
            <Badge tone="info">{parsed.columns.length} colunas</Badge>
          </div>

          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-surface sticky top-0 z-10">
                  <tr>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-content-muted px-2 py-2 border-b border-border-subtle text-right w-10">#</th>
                    {parsed.columns.map((c) => (
                      <th key={c.name} className="text-[11px] font-semibold uppercase tracking-wide text-content-muted px-3 py-2 border-b border-border-subtle whitespace-nowrap text-left min-w-[140px]">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-hover transition-colors">
                      <td className="px-2 py-2 text-right text-[11px] text-content-muted tabular-nums border-b border-border-subtle/40">{i + 1}</td>
                      {parsed.columns.map((c) => {
                        const v = row[c.name];
                        return (
                          <td key={c.name} className="px-3 py-2 text-content text-xs border-b border-border-subtle/40 whitespace-nowrap max-w-[200px] truncate">
                            {v === undefined || v === null || v === '' ? <span className="text-content-muted/40">—</span> : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-content-muted mt-2">Mostrando as primeiras 20 linhas de {parsed.rowCount.toLocaleString('pt-BR')}.</p>
        </div>
      )}

      {step === 'mapping' && parsed && (
        <ColumnMapper
          columns={parsed.columns}
          mapping={mapping}
          onMappingChange={setMapping}
          onAutoMap={() => {}}
          onClear={() => setMapping({})}
        />
      )}

      {step === 'validation' && report && parsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="sm">
              <p className="text-[11px] text-content-muted uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-content tabular-nums">{report.total.toLocaleString('pt-BR')}</p>
            </Card>
            <Card padding="sm">
              <p className="text-[11px] text-content-muted uppercase tracking-wide">Válidas</p>
              <p className="text-2xl font-bold text-success tabular-nums">{report.valid.toLocaleString('pt-BR')}</p>
            </Card>
            <Card padding="sm">
              <p className="text-[11px] text-content-muted uppercase tracking-wide">Inválidas</p>
              <p className="text-2xl font-bold text-danger tabular-nums">{report.invalid.toLocaleString('pt-BR')}</p>
            </Card>
            <Card padding="sm">
              <p className="text-[11px] text-content-muted uppercase tracking-wide">Duplicadas</p>
              <p className="text-2xl font-bold text-warning tabular-nums">{report.duplicateKeys.toLocaleString('pt-BR')}</p>
            </Card>
          </div>

          {Object.keys(report.errorsByType).length > 0 && (
            <div className="rounded-lg border border-border-subtle overflow-hidden">
              <div className="px-3 py-2 bg-surface border-b border-border-subtle">
                <p className="text-xs font-medium text-content">Erros por tipo</p>
              </div>
              <div className="divide-y divide-border-subtle/40">
                {Object.entries(report.errorsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-content">
                      {type === 'required' && 'Campos obrigatórios ausentes'}
                      {type === 'date' && 'Datas inválidas'}
                      {type === 'valor' && 'Valores não numéricos'}
                      {type === 'duplicate' && 'Possíveis duplicidades'}
                    </span>
                    <Badge tone={type === 'duplicate' ? 'warning' : 'danger'}>{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.invalid > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-lg bg-page border border-border-subtle cursor-pointer">
              <input
                type="checkbox"
                checked={includeErrors}
                onChange={(e) => setIncludeErrors(e.target.checked)}
                className="accent-[rgb(var(--accent-primary))] h-4 w-4"
              />
              <div className="flex-1">
                <p className="text-sm text-content">Incluir linhas com erro</p>
                <p className="text-[11px] text-content-muted">Linhas inválidas serão importadas com valores padrão onde campos obrigatórios estiverem ausentes.</p>
              </div>
            </label>
          )}

          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="px-3 py-2 bg-surface border-b border-border-subtle flex items-center gap-2">
              <AlertTriangle size={13} className="text-warning" />
              <p className="text-xs font-medium text-content">Amostra de linhas com erro ({Math.min(10, report.rows.filter((r) => r.errors.length > 0).length)})</p>
            </div>
            <div className="overflow-x-auto max-h-[200px]">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className="bg-surface sticky top-0">
                  <tr>
                    <th className="text-[10px] font-semibold uppercase tracking-wide text-content-muted px-2 py-1.5 border-b border-border-subtle text-right">#</th>
                    <th className="text-[10px] font-semibold uppercase tracking-wide text-content-muted px-3 py-1.5 border-b border-border-subtle text-left">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.filter((r) => r.errors.length > 0).slice(0, 10).map((r) => (
                    <tr key={r.index} className="border-b border-border-subtle/40">
                      <td className="px-2 py-1.5 text-right text-content-muted tabular-nums">{r.index + 1}</td>
                      <td className="px-3 py-1.5 text-danger">{r.errors.join(' · ')}</td>
                    </tr>
                  ))}
                  {report.rows.filter((r) => r.errors.length > 0).length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-4 text-center text-content-muted">Nenhuma linha com erro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-page border border-border-subtle">
            <p className="text-xs font-medium text-content mb-2">Modo de importação</p>
            <div className="flex gap-2">
              <button
                onClick={() => setImportMode('append')}
                className={cn('flex-1 p-3 rounded-lg border text-left transition-all', importMode === 'append' ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-content-muted/40')}
              >
                <p className="text-sm font-medium text-content">Adicionar aos dados existentes</p>
                <p className="text-[11px] text-content-muted">Mantém o dataset mock e adiciona os registros importados.</p>
              </button>
              <button
                onClick={() => setImportMode('replace')}
                className={cn('flex-1 p-3 rounded-lg border text-left transition-all', importMode === 'replace' ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-content-muted/40')}
              >
                <p className="text-sm font-medium text-content">Substituir tudo</p>
                <p className="text-[11px] text-content-muted">Remove importações anteriores e usa apenas os novos registros.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'confirm' && committed && report && (
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-16 w-16 rounded-2xl bg-success/10 grid place-items-center mb-4">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h3 className="text-lg font-semibold text-content">Importação concluída</h3>
          <p className="text-sm text-content-muted mt-1 max-w-md">
            {report.valid.toLocaleString('pt-BR')} registros foram importados com sucesso{report.invalid > 0 && !includeErrors ? ` e ${report.invalid} linhas inválidas foram descartadas` : ''}.
          </p>
          <p className="text-xs text-content-muted mt-3">
            Modo: {importMode === 'replace' ? 'Substituir tudo' : 'Adicionar aos existentes'} · Os dados já estão disponíveis em todos os módulos.
          </p>
        </div>
      )}
    </Modal>
  );
}
