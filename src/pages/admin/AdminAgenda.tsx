import { useEffect, useState } from 'react';
import { Calendar, Plus, Gavel, Users, Clock, Trash2, ChevronLeft, ChevronRight, View } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { Compromisso, Processo } from '../../types/database';
import { TIPO_COMPROMISSO_LABEL, type TipoCompromisso } from '../../types/database';
import { formatarDataHora, formatarDataPorExtenso } from '../../lib/utils';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

interface CompromissoComProcesso extends Compromisso {
  processo?: Processo | null;
}

const iconesTipo = { audiencia: Gavel, reuniao: Users, prazo: Clock, outro: Calendar };
const coresTipo = {
  audiencia: 'bg-danger-100 text-danger-700 border-danger-200',
  reuniao: 'bg-blue-100 text-blue-700 border-blue-200',
  prazo: 'bg-warning-100 text-warning-700 border-warning-200',
  outro: 'bg-ink-100 text-ink-700 border-ink-200',
};

export default function AdminAgenda() {
  const { user, perfil } = useAuth();
  const [compromissos, setCompromissos] = useState<CompromissoComProcesso[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', data_hora: '', tipo: 'audiencia' as TipoCompromisso, processo_id: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [dataRef, setDataRef] = useState(new Date()); // Mês ou semana de referência
  const [view, setView] = useState<'month' | 'week'>('week');

  const podeGerenciar = perfil?.papel === 'admin' || perfil?.papel === 'advogado';

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const papel = perfil?.papel ?? 'admin';
      const uid = user?.uid ?? '';
      const [comps, procs] = await Promise.all([
        db.listCompromissosVisiveis(papel, uid),
        db.listProcessosVisiveis(papel, uid),
      ]);
      setCompromissos(comps);
      setProcessos(procs.sort((a, b) => a.titulo.localeCompare(b.titulo)));
      setLoading(false);
    } catch {
      setLoading(false);
      toast.erro('Erro ao carregar a agenda. Verifique sua permissão de acesso.');
    }
  };

  const abrirNovo = (dataHora?: Date) => {
    const dataFormatada = dataHora
      ? `${dataHora.getFullYear()}-${(dataHora.getMonth() + 1).toString().padStart(2, '0')}-${dataHora.getDate().toString().padStart(2, '0')}T${dataHora.getHours().toString().padStart(2, '0')}:${dataHora.getMinutes().toString().padStart(2, '0')}`
      : '';
    setForm({ titulo: '', descricao: '', data_hora: dataFormatada, tipo: 'audiencia', processo_id: '' });
    setModalAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await db.createCompromisso({
        titulo: form.titulo,
        descricao: form.descricao || null,
        data_hora: new Date(form.data_hora).toISOString(),
        tipo: form.tipo,
        processo_id: form.processo_id || null,
        lembrete_enviado: false,
      });
    } catch {
      setSalvando(false);
      toast.erro('Erro ao agendar.');
      return;
    }
    setSalvando(false);
    toast.sucesso('Compromisso agendado!');
    setModalAberto(false);
    carregar();
  };

  const excluir = async (c: Compromisso) => {
    if (!confirm('Excluir este compromisso?')) return;
    await db.deleteCompromisso(c.id);
    toast.sucesso('Compromisso excluído.');
    carregar();
  };

  // --- Lógica para visualização de Mês ---
  const ano = dataRef.getFullYear();
  const mes = dataRef.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const inicioOffset = primeiroDia.getDay();

  const compromissosDoMes = compromissos.filter((c) => {
    const dataComp = new Date(c.data_hora);
    return dataComp.getFullYear() === ano && dataComp.getMonth() === mes;
  });

  const compromissosPorDia: Record<number, CompromissoComProcesso[]> = {};
  compromissosDoMes.forEach((c) => {
    const dia = new Date(c.data_hora).getDate();
    if (!compromissosPorDia[dia]) compromissosPorDia[dia] = [];
    compromissosPorDia[dia].push(c);
  });

  // --- Lógica para visualização de Semana ---
  const getSemana = (ref: Date) => {
    const inicio = new Date(ref);
    inicio.setDate(ref.getDate() - ref.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      return dia;
    });
  };
  const semana = getSemana(dataRef);
  const horas = Array.from({ length: 13 }, (_, i) => i + 7); // 7h às 19h

  // --- Lógica Geral ---
  const proximos = compromissos
    .filter((c) => new Date(c.data_hora).getTime() > Date.now())
    .slice(0, 6);

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const nomesMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (loading) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand-900">Agenda</h1>
          <p className="text-ink-500 mt-1">Audiências, reuniões e prazos.</p>
        </div>
        {podeGerenciar && (
          <button onClick={abrirNovo} className="btn-primary">
            <Plus size={18} /> Novo compromisso
          </button>
        )}
      </div>

      <div className="card p-6">
        {/* Cabeçalho do Calendário/Agenda */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-brand-900">
            {view === 'month' ? `${nomesMes[mes]} ${ano}` : `Semana de ${semana[0].getDate()} de ${nomesMes[semana[0].getMonth()]} a ${semana[6].getDate()} de ${nomesMes[semana[6].getMonth()]}`}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDataRef(new Date(dataRef.setDate(dataRef.getDate() - (view === 'week' ? 7 : diasNoMes))))}
              className="p-2 rounded-lg hover:bg-brand-50 text-ink-600"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setDataRef(new Date())}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-brand-50 text-ink-600"
            >
              Hoje
            </button>
            <button
              onClick={() => setDataRef(new Date(dataRef.setDate(dataRef.getDate() + (view === 'week' ? 7 : diasNoMes))))}
              className="p-2 rounded-lg hover:bg-brand-50 text-ink-600"
            >
              <ChevronRight size={18} />
            </button>
            <div className="ml-4 border-l border-ink-200 pl-2 flex gap-1">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-sm rounded-lg ${view === 'week' ? 'bg-brand-100 text-brand-800' : 'hover:bg-brand-50 text-ink-600'}`}
              >
                Semana
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-sm rounded-lg ${view === 'month' ? 'bg-brand-100 text-brand-800' : 'hover:bg-brand-50 text-ink-600'}`}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        {view === 'month' && (
          <div className="grid grid-cols-7 gap-1 animate-fade-in">
            {diasSemana.map((d) => <div key={d} className="text-center text-xs font-medium text-ink-500 py-2">{d}</div>)}
            {Array.from({ length: inicioOffset }).map((_, i) => <div key={`off-${i}`} />)}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const comps = compromissosPorDia[dia] || [];
              const isHoje = new Date().toDateString() === new Date(ano, mes, dia).toDateString();
              return (
                <div key={dia} className={`min-h-[80px] p-1.5 rounded-lg border ${isHoje ? 'border-brand-400 bg-brand-50' : 'border-ink-100'} ${podeGerenciar ? 'cursor-pointer hover:bg-brand-100' : ''}`} onClick={() => podeGerenciar && abrirNovo(new Date(ano, mes, dia))}>
                  <p className={`text-xs ${isHoje ? 'font-bold text-brand-800' : 'text-ink-500'}`}>{dia}</p>
                  {comps.slice(0, 2).map((c) => {
                    const Icone = iconesTipo[c.tipo];
                    return <div key={c.id} className={`mt-1 px-1.5 py-0.5 rounded text-[10px] border ${coresTipo[c.tipo]} truncate`} title={c.titulo}><Icone size={8} className="inline mr-0.5" />{c.titulo}</div>;
                  })}
                  {comps.length > 2 && <p className="text-[10px] text-ink-400 mt-0.5">+{comps.length - 2} mais</p>}
                </div>
              );
            })}
          </div>
        )}

        {view === 'week' && (
          <div className="grid grid-cols-[auto_1fr] animate-fade-in">
            {/* Coluna de Horas */}
            <div className="pr-2">
              <div className="h-12" /> {/* Espaço para o cabeçalho dos dias */}
              {horas.map(h => <div key={h} className="h-16 text-right text-xs text-ink-400 pr-2 -mt-2">{`${h}:00`}</div>)}
            </div>

            {/* Grade da Semana */}
            <div className="grid grid-cols-7 border-l border-ink-100">
              {semana.map((dia, diaIndex) => {
                const isHoje = new Date().toDateString() === dia.toDateString();
                const compsDoDia = compromissos.filter(c => new Date(c.data_hora).toDateString() === dia.toDateString());
                return (
                  <div key={diaIndex} className="relative border-r border-ink-100">
                    <div className={`h-12 text-center py-2 border-b border-ink-100 ${isHoje ? 'bg-brand-50' : ''}`}>
                      <p className="text-xs text-ink-500">{diasSemana[dia.getDay()]}</p>
                      <p className={`text-lg font-medium ${isHoje ? 'text-brand-800' : 'text-ink-800'}`}>{dia.getDate()}</p>
                    </div>
                    {/* Slots de hora clicáveis */}
                    {horas.map(h => (
                      <div key={h} className="h-16 border-b border-ink-100 cursor-pointer hover:bg-brand-50/50" onClick={() => podeGerenciar && abrirNovo(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h))}/>
                    ))}
                    {/* Renderização dos compromissos */}
                    {compsDoDia.map(c => {
                      const dataComp = new Date(c.data_hora);
                      const top = ((dataComp.getHours() - 7) * 60 + dataComp.getMinutes()) / (13 * 60) * (13 * 64); // 64px = 16 * 4 (h-16)
                      const Icone = iconesTipo[c.tipo];
                      return (
                        <div key={c.id} style={{ top: `${top}px`, left: '2px', right: '2px' }} className={`absolute p-1.5 rounded-lg border ${coresTipo[c.tipo]} z-10 group`}>
                          <p className="text-[10px] font-bold truncate flex items-center gap-1"><Icone size={10} /> {c.titulo}</p>
                          <p className="text-[9px] truncate">{dataComp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          {podeGerenciar && <button onClick={() => excluir(c)} className="absolute top-0 right-0 p-0.5 bg-white/50 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={10} className="text-danger-600" /></button>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo compromisso">
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Data e hora *</label>
              <input required type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCompromisso })} className="input-field">
                {Object.entries(TIPO_COMPROMISSO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Vincular a processo (opcional)</label>
            <select value={form.processo_id} onChange={(e) => setForm({ ...form, processo_id: e.target.value })} className="input-field">
              <option value="">Sem vínculo</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.titulo} ({p.numero})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando…' : 'Agendar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
