import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Gavel, Users, AlertCircle } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Compromisso, Processo } from '../../types/database';
import { TIPO_COMPROMISSO_LABEL } from '../../types/database';
import { formatarDataPorExtenso, formatarDataHora } from '../../lib/utils';

interface CompromissoComProcesso extends Compromisso {
  processo?: Processo | null;
}

const iconesTipo = {
  audiencia: Gavel,
  reuniao: Users,
  prazo: Clock,
  outro: AlertCircle,
};

const coresTipo = {
  audiencia: 'bg-danger-50 text-danger-700 border-danger-100',
  reuniao: 'bg-blue-50 text-blue-700 border-blue-100',
  prazo: 'bg-warning-50 text-warning-700 border-warning-100',
  outro: 'bg-ink-100 text-ink-700 border-ink-200',
};

export default function PortalAgenda() {
  const { user } = useAuth();
  const [compromissos, setCompromissos] = useState<CompromissoComProcesso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    db.cliente.listCompromissos(user.uid)
      .then((c) => {
        setCompromissos(c);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Fallback: se RLS via processos.cliente_id não retornar (cliente sem processo),
  // simplesmente mostra vazio. A query já filtra corretamente.

  const proximos = compromissos.filter(
    (c) => new Date(c.data_hora).getTime() > Date.now()
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Próximos Compromissos</h1>
        <p className="text-ink-500 mt-1">Audiências, reuniões e prazos agendados.</p>
      </div>

      {proximos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-brand-600" />
          </div>
          <h3 className="font-serif text-xl text-brand-900 mb-2">Nenhum compromisso agendado</h3>
          <p className="text-ink-500 text-sm">
            Você não possui audiências ou reuniões próximas no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proximos.map((c) => {
            const Icone = iconesTipo[c.tipo] || Calendar;
            const cor = coresTipo[c.tipo];
            const data = new Date(c.data_hora);
            return (
              <div key={c.id} className="card p-5 flex gap-5 items-start hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-brand-800 text-brand-50 shrink-0">
                  <span className="text-2xl font-serif leading-none">{data.getDate()}</span>
                  <span className="text-xs uppercase tracking-wide text-brand-200 mt-1">
                    {data.toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${cor}`}>
                      <Icone size={12} />
                      {TIPO_COMPROMISSO_LABEL[c.tipo]}
                    </span>
                    <span className="text-xs text-ink-400">{formatarDataHora(c.data_hora)}</span>
                  </div>
                  <h3 className="font-serif text-lg text-brand-900">{c.titulo}</h3>
                  {c.descricao && <p className="text-sm text-ink-600 mt-1">{c.descricao}</p>}
                  {c.processo && (
                    <p className="text-xs text-ink-400 mt-2">
                      Processo: {c.processo.numero} · {c.processo.area_direito}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
