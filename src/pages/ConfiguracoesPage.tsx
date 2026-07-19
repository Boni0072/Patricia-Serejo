import { useState } from 'react';
import { Save, SlidersHorizontal, Palette, Shield, Database, Bell } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { FontesTab } from '../components/FontesTab';
import { useThemeStore } from '../store/theme';
import { DEFAULT_THRESHOLDS } from '../lib/kpi';
import { cn } from '../lib/format';

export function ConfiguracoesPage() {
  const { theme, set } = useThemeStore();
  const [margemGood, setMargemGood] = useState(String(DEFAULT_THRESHOLDS.margemEbitda.good));
  const [margemWarn, setMargemWarn] = useState(String(DEFAULT_THRESHOLDS.margemEbitda.warn));
  const [deltaGood, setDeltaGood] = useState(String(DEFAULT_THRESHOLDS.delta.good));
  const [deltaWarn, setDeltaWarn] = useState(String(DEFAULT_THRESHOLDS.delta.warn));
  const [budgetGood, setBudgetGood] = useState(String(DEFAULT_THRESHOLDS.budgetAdherence.good));
  const [budgetWarn, setBudgetWarn] = useState(String(DEFAULT_THRESHOLDS.budgetAdherence.warn));
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="pb-20 md:pb-6 max-w-4xl">
      <PageHeader title="Configurações" subtitle="Ajuste de thresholds, aparência, perfis e fontes de dados. Preferências são salvas por usuário." />

      <Tabs
        tabs={[
          {
            id: 'thresholds',
            label: <span className="flex items-center gap-1.5"><SlidersHorizontal size={13} /> Thresholds</span>,
            content: (
              <div className="space-y-4">
                <Card padding="md">
                  <CardHeader title="Margem EBITDA" subtitle="Limites (%) para classificar o indicador como bom / atenção / crítico." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bom (≥)"><Input type="number" value={margemGood} onChange={(e) => setMargemGood(e.target.value)} /></Field>
                    <Field label="Atenção (≥)"><Input type="number" value={margemWarn} onChange={(e) => setMargemWarn(e.target.value)} /></Field>
                  </div>
                </Card>
                <Card padding="md">
                  <CardHeader title="Variação vs período anterior" subtitle="Limites (%) de delta para classificar tendência." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bom (≥)"><Input type="number" value={deltaGood} onChange={(e) => setDeltaGood(e.target.value)} /></Field>
                    <Field label="Atenção (≥)"><Input type="number" value={deltaWarn} onChange={(e) => setDeltaWarn(e.target.value)} /></Field>
                  </div>
                </Card>
                <Card padding="md">
                  <CardHeader title="Aderência ao Budget" subtitle="Limites (%) de realizado/budget." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bom (≥)"><Input type="number" value={budgetGood} onChange={(e) => setBudgetGood(e.target.value)} /></Field>
                    <Field label="Atenção (≥)"><Input type="number" value={budgetWarn} onChange={(e) => setBudgetWarn(e.target.value)} /></Field>
                  </div>
                </Card>
                <div className="flex justify-end">
                  <Button variant="primary" leftIcon={<Save size={15} />} onClick={save}>{saved ? 'Salvo!' : 'Salvar thresholds'}</Button>
                </div>
              </div>
            ),
          },
          {
            id: 'tema',
            label: <span className="flex items-center gap-1.5"><Palette size={13} /> Aparência</span>,
            content: (
              <Card padding="md">
                <CardHeader title="Tema" subtitle="O produto nasce escuro (dark mode principal). Light mode é a variação." />
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {(['dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => set(t)}
                      className={cn(
                        'rounded-xl p-4 border-2 text-left transition-all',
                        theme === t ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-content-muted/40',
                      )}
                    >
                      <div className={cn('h-16 rounded-lg mb-3', t === 'dark' ? 'bg-[#0A0E14]' : 'bg-[#F7F8FA]')}>
                        <div className={cn('h-full m-2 rounded flex items-center justify-center text-xs', t === 'dark' ? 'bg-[#12161F] text-[#F5F6F8]' : 'bg-white text-[#161B26]')}>
                          {t === 'dark' ? 'Dark' : 'Light'}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-content capitalize">{t === 'dark' ? 'Escuro' : 'Claro'}</p>
                      <p className="text-xs text-content-muted">{theme === t ? 'Ativo' : 'Selecionar'}</p>
                    </button>
                  ))}
                </div>
              </Card>
            ),
          },
          {
            id: 'perfis',
            label: <span className="flex items-center gap-1.5"><Shield size={13} /> Perfis</span>,
            content: (
              <Card padding="md">
                <CardHeader title="Perfis de acesso" subtitle="Visibilidade reforçada por Row Level Security no Supabase — não apenas no front-end." />
                <div className="space-y-2">
                  {[
                    { p: 'Administrador', d: 'Acesso total a todos os módulos, dados e configurações.' },
                    { p: 'Diretoria', d: 'Visão executiva consolidada; sem acesso a lançamentos detalhados.' },
                    { p: 'Controladoria', d: 'Acesso a controladoria, budget, indicadores e fechamento.' },
                    { p: 'Contabilidade', d: 'Lançamentos, notas fiscais e conciliação.' },
                    { p: 'Financeiro', d: 'Fluxo de caixa, contas a pagar/receber e tesouraria.' },
                    { p: 'Compras', d: 'Fornecedores, pedidos e contratos.' },
                  ].map((r) => (
                    <div key={r.p} className="flex items-start gap-3 p-3 rounded-lg bg-page border border-border-subtle">
                      <div className="h-8 w-8 rounded-lg bg-accent/15 grid place-items-center shrink-0"><Shield size={15} className="text-accent" /></div>
                      <div><p className="text-sm font-medium text-content">{r.p}</p><p className="text-xs text-content-muted mt-0.5">{r.d}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            ),
          },
          {
            id: 'fontes',
            label: <span className="flex items-center gap-1.5"><Database size={13} /> Fontes</span>,
            content: <FontesTab />,
          },
          {
            id: 'notificacoes',
            label: <span className="flex items-center gap-1.5"><Bell size={13} /> Notificações</span>,
            content: (
              <Card padding="md">
                <CardHeader title="Preferências de notificação" subtitle="Quais alertas geram notificação (em breve: e-mail e push)." />
                <div className="space-y-3">
                  {['Budget estourado', 'Fluxo de caixa negativo', 'Fornecedor bloqueado', 'Projeto atrasado', 'Nota fiscal pendente'].map((n) => (
                    <label key={n} className="flex items-center justify-between p-3 rounded-lg bg-page border border-border-subtle cursor-pointer">
                      <span className="text-sm text-content">{n}</span>
                      <input type="checkbox" defaultChecked className="accent-[rgb(var(--accent-primary))] h-4 w-4" />
                    </label>
                  ))}
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
