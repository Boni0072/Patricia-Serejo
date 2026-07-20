import { useEffect, useState } from 'react';
import {
  FileText, Scale, MessageSquareQuote, Save, Plus, Trash2, Pencil,
  GripVertical, Eye, EyeOff,
} from 'lucide-react';
import * as db from '../../lib/db';
import type { AreaAtuacao, Depoimento } from '../../types/database';
import { toast } from '../../components/Toast';
import Modal from '../../components/Modal';

type Aba = 'textos' | 'areas' | 'depoimentos';

const ICONES_DISPONIVEIS = [
  'Scale', 'Users', 'FileText', 'Briefcase', 'HeartPulse', 'Building2',
  'Gavel', 'Shield', 'Landmark', 'FileSignature', 'Hammer', 'BookOpen',
];

const CHAVES_TEXTO = [
  { chave: 'hero_titulo', label: 'Título principal (Hero)', tipo: 'texto' },
  { chave: 'hero_subtitulo', label: 'Subtítulo (Hero)', tipo: 'texto' },
  { chave: 'hero_botao', label: 'Texto do botão (Hero)', tipo: 'texto' },
  { chave: 'sobre_titulo', label: 'Título da seção Sobre', tipo: 'texto' },
  { chave: 'sobre_texto', label: 'Texto da seção Sobre', tipo: 'area' },
  { chave: 'contato_telefone', label: 'Telefone de contato', tipo: 'texto' },
  { chave: 'contato_whatsapp', label: 'Número WhatsApp (com DDI, só dígitos)', tipo: 'texto' },
  { chave: 'contato_email', label: 'E-mail de contato', tipo: 'texto' },
  { chave: 'contato_endereco', label: 'Endereço', tipo: 'texto' },
  { chave: 'contato_horario', label: 'Horário de atendimento', tipo: 'texto' },
  { chave: 'rodape_texto', label: 'Texto do rodapé', tipo: 'texto' },
  { chave: 'instagram_url', label: 'URL do Instagram', tipo: 'texto' },
  { chave: 'linkedin_url', label: 'URL do LinkedIn', tipo: 'texto' },
];

export default function AdminConteudo() {
  const [aba, setAba] = useState<Aba>('textos');
  const [conteudo, setConteudo] = useState<Record<string, string>>({});
  const [areas, setAreas] = useState<AreaAtuacao[]>([]);
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvandoTexto, setSalvandoTexto] = useState(false);

  const [modalArea, setModalArea] = useState(false);
  const [editArea, setEditArea] = useState<AreaAtuacao | null>(null);
  const [formArea, setFormArea] = useState({ titulo: '', descricao: '', icone: 'Scale', ordem: 0, ativo: true });

  const [modalDep, setModalDep] = useState(false);
  const [editDep, setEditDep] = useState<Depoimento | null>(null);
  const [formDep, setFormDep] = useState({ nome: '', texto: '', cargo: '', ordem: 0, ativo: true });

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const [map, arrAreas, arrDeps] = await Promise.all([
      db.getConteudoSite(),
      db.listAreasAtuacao(),
      db.listDepoimentos(),
    ]);
    setConteudo(map);
    setAreas(arrAreas);
    setDepoimentos(arrDeps);
    setLoading(false);
  };

  const salvarTextos = async () => {
    setSalvandoTexto(true);
    await Promise.all(
      Object.entries(conteudo).map(([chave, valor]) => db.upsertConteudoSite(chave, valor))
    );
    setSalvandoTexto(false);
    toast.sucesso('Conteúdo do site salvo!');
  };

  const salvarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      titulo: formArea.titulo,
      descricao: formArea.descricao,
      icone: formArea.icone,
      ordem: formArea.ordem,
      ativo: formArea.ativo,
    };
    if (editArea) {
      await db.updateAreaAtuacao(editArea.id, payload);
    } else {
      await db.createAreaAtuacao(payload);
    }
    toast.sucesso('Área salva!');
    setModalArea(false);
    carregar();
  };

  const excluirArea = async (a: AreaAtuacao) => {
    if (!confirm(`Excluir "${a.titulo}"?`)) return;
    await db.deleteAreaAtuacao(a.id);
    toast.sucesso('Área excluída.');
    carregar();
  };

  const salvarDep = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: formDep.nome,
      texto: formDep.texto,
      cargo: formDep.cargo || null,
      ordem: formDep.ordem,
      ativo: formDep.ativo,
    };
    if (editDep) {
      await db.updateDepoimento(editDep.id, payload);
    } else {
      await db.createDepoimento(payload);
    }
    toast.sucesso('Depoimento salvo!');
    setModalDep(false);
    carregar();
  };

  const excluirDep = async (d: Depoimento) => {
    if (!confirm(`Excluir depoimento de "${d.nome}"?`)) return;
    await db.deleteDepoimento(d.id);
    toast.sucesso('Depoimento excluído.');
    carregar();
  };

  const toggleAtivo = async (tabela: 'areas_atuacao' | 'depoimentos', item: AreaAtuacao | Depoimento) => {
    if (tabela === 'areas_atuacao') {
      await db.updateAreaAtuacao(item.id, { ativo: !item.ativo });
    } else {
      await db.updateDepoimento(item.id, { ativo: !item.ativo });
    }
    carregar();
  };

  if (loading) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto" /></div>;
  }

  const abas: { id: Aba; label: string; icon: typeof FileText }[] = [
    { id: 'textos', label: 'Textos do Site', icon: FileText },
    { id: 'areas', label: 'Áreas de Atuação', icon: Scale },
    { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquareQuote },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-brand-900">Conteúdo do Site</h1>
        <p className="text-ink-500 mt-1">Edite os textos e seções do site institucional sem mexer no código.</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-ink-100">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === a.id ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <a.icon size={16} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Textos */}
      {aba === 'textos' && (
        <div className="animate-fade-in">
          <div className="space-y-5">
            {CHAVES_TEXTO.map(({ chave, label, tipo }) => (
              <div key={chave} className="card p-5">
                <label className="block text-sm font-medium text-ink-700 mb-2">{label}</label>
                {tipo === 'area' ? (
                  <textarea
                    value={conteudo[chave] || ''}
                    onChange={(e) => setConteudo({ ...conteudo, [chave]: e.target.value })}
                    className="input-field min-h-[100px] resize-y"
                  />
                ) : (
                  <input
                    value={conteudo[chave] || ''}
                    onChange={(e) => setConteudo({ ...conteudo, [chave]: e.target.value })}
                    className="input-field"
                  />
                )}
                <p className="text-xs text-ink-400 mt-1.5 font-mono">{chave}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={salvarTextos} disabled={salvandoTexto} className="btn-primary">
              {salvandoTexto ? 'Salvando…' : (<><Save size={18} /> Salvar todos os textos</>)}
            </button>
          </div>
        </div>
      )}

      {/* Áreas */}
      {aba === 'areas' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditArea(null);
                setFormArea({ titulo: '', descricao: '', icone: 'Scale', ordem: areas.length + 1, ativo: true });
                setModalArea(true);
              }}
              className="btn-primary text-sm"
            >
              <Plus size={16} /> Nova área
            </button>
          </div>
          <div className="space-y-2">
            {areas.map((a) => (
              <div key={a.id} className="card p-4 flex items-center gap-4 group">
                <GripVertical size={16} className="text-ink-300" />
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <Scale size={18} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-brand-900 text-sm">{a.titulo}</p>
                    {!a.ativo && <span className="badge bg-ink-100 text-ink-500 border-ink-200">Inativo</span>}
                    <span className="text-xs text-ink-400">Ordem: {a.ordem}</span>
                  </div>
                  <p className="text-xs text-ink-500 truncate mt-0.5">{a.descricao}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAtivo('areas_atuacao', a)}
                    className="p-2 text-ink-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                    title={a.ativo ? 'Ocultar' : 'Mostrar'}
                  >
                    {a.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      setEditArea(a);
                      setFormArea({ titulo: a.titulo, descricao: a.descricao, icone: a.icone, ordem: a.ordem, ativo: a.ativo });
                      setModalArea(true);
                    }}
                    className="p-2 text-ink-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => excluirArea(a)}
                    className="p-2 text-ink-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Depoimentos */}
      {aba === 'depoimentos' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditDep(null);
                setFormDep({ nome: '', texto: '', cargo: '', ordem: depoimentos.length + 1, ativo: true });
                setModalDep(true);
              }}
              className="btn-primary text-sm"
            >
              <Plus size={16} /> Novo depoimento
            </button>
          </div>
          <div className="space-y-2">
            {depoimentos.map((d) => (
              <div key={d.id} className="card p-4 flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center text-gold-400 font-serif shrink-0">
                  {d.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-brand-900 text-sm">{d.nome}</p>
                    {!d.ativo && <span className="badge bg-ink-100 text-ink-500 border-ink-200">Inativo</span>}
                  </div>
                  {d.cargo && <p className="text-xs text-ink-400">{d.cargo}</p>}
                  <p className="text-xs text-ink-600 mt-1 italic">"{d.texto}"</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAtivo('depoimentos', d)}
                    className="p-2 text-ink-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                  >
                    {d.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      setEditDep(d);
                      setFormDep({ nome: d.nome, texto: d.texto, cargo: d.cargo || '', ordem: d.ordem, ativo: d.ativo });
                      setModalDep(true);
                    }}
                    className="p-2 text-ink-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => excluirDep(d)}
                    className="p-2 text-ink-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal área */}
      <Modal aberto={modalArea} onFechar={() => setModalArea(false)} titulo={editArea ? 'Editar área' : 'Nova área'}>
        <form onSubmit={salvarArea} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Título *</label>
            <input required value={formArea.titulo} onChange={(e) => setFormArea({ ...formArea, titulo: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Descrição *</label>
            <textarea required value={formArea.descricao} onChange={(e) => setFormArea({ ...formArea, descricao: e.target.value })} className="input-field min-h-[80px] resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Ícone</label>
              <select value={formArea.icone} onChange={(e) => setFormArea({ ...formArea, icone: e.target.value })} className="input-field">
                {ICONES_DISPONIVEIS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Ordem</label>
              <input type="number" value={formArea.ordem} onChange={(e) => setFormArea({ ...formArea, ordem: Number(e.target.value) })} className="input-field" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formArea.ativo} onChange={(e) => setFormArea({ ...formArea, ativo: e.target.checked })} className="w-4 h-4 accent-brand-700" />
            <span className="text-sm text-ink-700">Exibir no site</span>
          </label>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalArea(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Modal depoimento */}
      <Modal aberto={modalDep} onFechar={() => setModalDep(false)} titulo={editDep ? 'Editar depoimento' : 'Novo depoimento'} tamanho="md">
        <form onSubmit={salvarDep} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome *</label>
            <input required value={formDep.nome} onChange={(e) => setFormDep({ ...formDep, nome: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Cargo / descrição</label>
            <input value={formDep.cargo} onChange={(e) => setFormDep({ ...formDep, cargo: e.target.value })} className="input-field" placeholder="Ex.: Cliente — Direito de Família" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Depoimento *</label>
            <textarea required value={formDep.texto} onChange={(e) => setFormDep({ ...formDep, texto: e.target.value })} className="input-field min-h-[100px] resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Ordem</label>
            <input type="number" value={formDep.ordem} onChange={(e) => setFormDep({ ...formDep, ordem: Number(e.target.value) })} className="input-field" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formDep.ativo} onChange={(e) => setFormDep({ ...formDep, ativo: e.target.checked })} className="w-4 h-4 accent-brand-700" />
            <span className="text-sm text-ink-700">Exibir no site</span>
          </label>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalDep(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
