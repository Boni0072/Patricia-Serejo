import { useState } from 'react';
import { Cloud, ShieldAlert, Save, Trash2, Info, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Field } from './ui/Select';
import { Badge } from './ui/Badge';
import { useDataSourcesStore, type BigQueryConfig as BQConfig } from '../store/dataSources';
import { cn } from '../lib/format';

interface BigQueryConfigModalProps {
  open: boolean;
  onClose: () => void;
  moduleId?: string;
  moduleLabel?: string;
}

const EMPTY: BQConfig = {
  projectId: '',
  dataset: '',
  table: '',
  authMethod: 'service_account',
  serviceAccountKey: '',
  oauthClientEmail: '',
};

export function BigQueryConfigModal({ open, onClose, moduleId, moduleLabel }: BigQueryConfigModalProps) {
  const { bigQuery, saveBigQuery, clearBigQuery, getModuleSource, setModuleSource } = useDataSourcesStore();
  const existing = moduleId ? getModuleSource(moduleId)?.bigQuery : bigQuery;
  const [config, setConfig] = useState<BQConfig>(existing ?? EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!existing;

  const handleSave = () => {
    setError(null);
    if (!config.projectId.trim()) { setError('Project ID é obrigatório'); return; }
    if (!config.dataset.trim()) { setError('Dataset é obrigatório'); return; }
    if (!config.table.trim()) { setError('Tabela é obrigatório'); return; }
    if (config.authMethod === 'service_account' && !config.serviceAccountKey?.trim()) {
      setError('A Service Account Key JSON é obrigatória para este método'); return;
    }
    if (config.authMethod === 'oauth' && !config.oauthClientEmail?.trim()) {
      setError('O e-mail do cliente OAuth é obrigatório'); return;
    }
    if (config.authMethod === 'service_account') {
      try { JSON.parse(config.serviceAccountKey!); }
      catch { setError('A Service Account Key não é um JSON válido'); return; }
    }
    if (moduleId) {
      setModuleSource(moduleId, { type: 'bigquery', bigQuery: config });
    } else {
      saveBigQuery(config);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  const handleClear = () => {
    if (moduleId) {
      setModuleSource(moduleId, { type: 'mock' });
    } else {
      clearBigQuery();
    }
    setConfig(EMPTY);
    onClose();
  };

  const titleSuffix = moduleLabel ? ` — ${moduleLabel}` : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurar BigQuery${titleSuffix}`}
      subtitle="Google Cloud BigQuery — conexão para importação de dados"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={handleClear}>
              Remover configuração
            </Button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" leftIcon={saved ? <CheckCircle2 size={15} /> : <Save size={15} />} onClick={handleSave}>
              {saved ? 'Salvo!' : 'Salvar configuração'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-warning/10 border border-warning/30">
          <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-content">A consulta real ao BigQuery exige backend</p>
            <p className="text-xs text-content-muted mt-1 leading-relaxed">
              Esta tela salva a configuração localmente para a Fase 2. A consulta efetiva ao BigQuery
              será feita por uma Supabase Edge Function para não expor credenciais no navegador.
              Nenhum dado será buscado neste momento.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-page border border-border-subtle p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Info size={14} className="text-info" />
            <p className="text-xs font-medium text-content">Status atual</p>
          </div>
          <p className="text-xs text-content-muted">
            {isEdit
              ? 'Configuração salva — aguardando backend (Fase 2) para ativar a conexão.'
              : 'Não configurado — preencha os campos abaixo para preparar a conexão.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Project ID" hint="Ex: minha-empresa-prod">
            <Input
              value={config.projectId}
              onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
              placeholder="my-project-123"
            />
          </Field>
          <Field label="Dataset" hint="Ex: financeiro">
            <Input
              value={config.dataset}
              onChange={(e) => setConfig({ ...config, dataset: e.target.value })}
              placeholder="financeiro"
            />
          </Field>
          <Field label="Tabela" hint="Ex: lancamentos">
            <Input
              value={config.table}
              onChange={(e) => setConfig({ ...config, table: e.target.value })}
              placeholder="lancamentos"
            />
          </Field>
        </div>

        <Field label="Método de autenticação">
          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, authMethod: 'service_account' })}
              className={cn(
                'flex-1 flex items-center gap-2 p-3 rounded-lg border text-left transition-all',
                config.authMethod === 'service_account' ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-content-muted/40',
              )}
            >
              <KeyRound size={15} className={config.authMethod === 'service_account' ? 'text-accent' : 'text-content-muted'} />
              <div>
                <p className="text-sm font-medium text-content">Service Account Key</p>
                <p className="text-[11px] text-content-muted">JSON da chave da conta de serviço</p>
              </div>
            </button>
            <button
              onClick={() => setConfig({ ...config, authMethod: 'oauth' })}
              className={cn(
                'flex-1 flex items-center gap-2 p-3 rounded-lg border text-left transition-all',
                config.authMethod === 'oauth' ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-content-muted/40',
              )}
            >
              <Mail size={15} className={config.authMethod === 'oauth' ? 'text-accent' : 'text-content-muted'} />
              <div>
                <p className="text-sm font-medium text-content">OAuth</p>
                <p className="text-[11px] text-content-muted">Autenticação via OAuth 2.0</p>
              </div>
            </button>
          </div>
        </Field>

        {config.authMethod === 'service_account' ? (
          <Field
            label="Service Account Key (JSON)"
            hint="Cole o conteúdo completo do arquivo JSON da Service Account. Será validado como JSON antes de salvar."
          >
            <Textarea
              value={config.serviceAccountKey ?? ''}
              onChange={(e) => setConfig({ ...config, serviceAccountKey: e.target.value })}
              placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "sa@my-project.iam.gserviceaccount.com"\n}'}
              className="font-mono text-xs min-h-[140px]"
            />
          </Field>
        ) : (
          <Field label="E-mail do cliente OAuth" hint="Client e-mail configurado no Google Cloud Console">
            <Input
              type="email"
              value={config.oauthClientEmail ?? ''}
              onChange={(e) => setConfig({ ...config, oauthClientEmail: e.target.value })}
              placeholder="client@my-project.iam.gserviceaccount.com"
            />
          </Field>
        )}

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/10 border border-danger/30">
            <ShieldAlert size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {isEdit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 size={16} className="text-success shrink-0" />
            <p className="text-xs text-content">
              Configuração salva em <span className="font-mono">{new Date(bigQuery!.savedAt!).toLocaleString('pt-BR')}</span>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
