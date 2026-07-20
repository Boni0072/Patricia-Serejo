import { useEffect, useState } from 'react';
import { ScrollText, Search, LogIn, LogOut, UserPlus } from 'lucide-react';
import * as db from '../../lib/db';
import type { LogAcesso } from '../../types/database';
import { formatarDataHora } from '../../lib/utils';

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
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-brand-50/50">
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3">Ação</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3">Usuário</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Papel</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">IP</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-3">Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const Icone = ICONE_ACAO[l.acao] || ScrollText;
                return (
                  <tr key={l.id} className="border-b border-ink-50 hover:bg-brand-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          l.acao === 'login' ? 'bg-success-50 text-success-600' :
                          l.acao === 'logout' ? 'bg-ink-100 text-ink-500' :
                          'bg-brand-100 text-brand-700'
                        }`}>
                          <Icone size={14} />
                        </div>
                        <span className="text-sm text-ink-700 capitalize">{l.acao}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700">{l.email || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {l.papel && <span className="badge bg-ink-100 text-ink-600 border-ink-200 capitalize">{l.papel}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-ink-400 font-mono">{l.ip || '—'}</td>
                    <td className="px-4 py-3 text-sm text-ink-500">{formatarDataHora(l.criado_em)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
