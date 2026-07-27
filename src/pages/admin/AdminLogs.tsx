import { useEffect, useState } from 'react';
import { ScrollText, Search, LogIn, LogOut, UserPlus } from 'lucide-react';
import * as db from '../../lib/db';
import type { LogAcesso } from '../../types/database';
import { formatarDataHora, formatarDataPorExtenso } from '../../lib/utils';

const ICONE_ACAO: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  cadastro: UserPlus,
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.listLogsAcesso(200)
      .then((l) => {
        setLogs(l);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtrados = logs.filter((l) => {
    const q = busca.toLowerCase();
    return (l.email || '').toLowerCase().includes(q) || l.acao.toLowerCase().includes(q);
  });

  const logsAgrupados = filtrados.reduce((acc, log) => {
    const data = new Date(log.criado_em).toISOString().split('T')[0];
    if (!acc[data]) {
      acc[data] = [];
    }
    acc[data]!.push(log);
    return acc;
  }, {} as Record<string, LogAcesso[]>);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Logs de Acesso</h1>
        <p className="text-ink-500 mt-1">Registro de acessos ao sistema para auditoria.</p>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por e-mail ou ação…"
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <ScrollText size={32} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(logsAgrupados).map(([data, logsDoDia]) => (
            <div key={data}>
              <h3 className="font-serif text-lg text-brand-900 mb-3 border-b border-ink-100 pb-2">
                {formatarDataPorExtenso(data)}
              </h3>
              <div className="space-y-2">
                {logsDoDia.map((l) => {
                  const Icone = ICONE_ACAO[l.acao] || ScrollText;
                  return (
                    <div key={l.id} className="card p-3 flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        l.acao === 'login' ? 'bg-success-50 text-success-600' :
                        l.acao === 'logout' ? 'bg-ink-100 text-ink-500' :
                        'bg-brand-100 text-brand-700'
                      }`}>
                        <Icone size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-800">
                          <span className="font-medium">{l.email || 'Sistema'}</span>{' '}
                          <span className="capitalize">{l.acao === 'login' ? 'fez login' : l.acao === 'logout' ? 'fez logout' : 'se cadastrou'}.</span>
                        </p>
                        <p className="text-xs text-ink-400">{l.papel ? `Papel: ${l.papel}` : ''}{l.ip ? ` · IP: ${l.ip}` : ''}</p>
                      </div>
                      <p className="text-xs text-ink-500 shrink-0">{new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
