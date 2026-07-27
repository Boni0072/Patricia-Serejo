import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ChevronRight, Scale, AlertCircle } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Processo, Cliente } from '../../types/database';
import { STATUS_PROCESSO_LABEL, STATUS_PROCESSO_COR } from '../../types/database';
import { formatarData } from '../../lib/utils';

interface ProcessoComCliente extends Processo {
  cliente?: Cliente | null;
}

export default function PortalProcessos() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<ProcessoComCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    db.cliente.listProcessos(user.uid)
      .then((p) => {
        setProcessos(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Meus Processos</h1>
        <p className="text-ink-500 mt-1">Acompanhe o andamento dos seus processos.</p>
      </div>

      {processos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={28} className="text-brand-600" />
          </div>
          <h3 className="font-serif text-xl text-brand-900 mb-2">Nenhum processo vinculado</h3>
          <p className="text-ink-500 text-sm max-w-md mx-auto">
            No momento não há processos associados à sua conta. Caso acredite que seja um
            erro, entre em contato com o escritório.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {processos.map((p) => (
            <Link
              key={p.id}
              to={`/portal/processos/${p.id}`}
              className="card p-6 hover:shadow-md hover:border-brand-200 transition-all group flex items-center justify-between"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-lg bg-brand-100 group-hover:bg-brand-800 transition-colors flex items-center justify-center shrink-0">
                  <Scale size={22} className="text-brand-700 group-hover:text-gold-400 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif text-lg text-brand-900 truncate">{p.titulo}</h3>
                    <span className={`badge ${STATUS_PROCESSO_COR[p.status]}`}>
                      {STATUS_PROCESSO_LABEL[p.status]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-500 mt-1">
                    {p.numero} · {p.area_direito}
                  </p>
                  <p className="text-xs text-ink-400 mt-2">
                    Atualizado em {formatarData(p.atualizado_em)}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-ink-300 group-hover:text-brand-700 shrink-0 ml-4" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
