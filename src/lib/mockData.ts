import type { Empresa, FactRecord, Fornecedor, Projeto, TipoMovimento } from '../types';

const EMPRESAS: Empresa[] = [
  { id: 'emp-01', nome: 'Matriz SP', regiao: 'Sudeste' },
  { id: 'emp-02', nome: 'Filial RJ', regiao: 'Sudeste' },
  { id: 'emp-03', nome: 'Filial RS', regiao: 'Sul' },
];

const LOJAS = [
  'Loja Centro', 'Loja Shopping', 'Loja Norte', 'Loja Sul', 'Loja Online',
];

const CENTROS_CUSTO = [
  'TI', 'RH', 'Financeiro', 'Comercial', 'Operações',
  'Marketing', 'Logística', 'Administrativo', 'Jurídico', 'Compras',
];

const FORNECEDORES: Fornecedor[] = [
  { id: 'f-01', nome: 'TechSupply Ltda', status: 'ativo' },
  { id: 'f-02', nome: 'Global Services', status: 'ativo' },
  { id: 'f-03', nome: 'Metais & Cia', status: 'ativo' },
  { id: 'f-04', nome: 'EnergiaMais', status: 'bloqueado' },
  { id: 'f-05', nome: 'LogExpress', status: 'ativo' },
  { id: 'f-06', nome: 'ConsultPro', status: 'ativo' },
  { id: 'f-07', nome: 'InsumosBR', status: 'suspenso' },
  { id: 'f-08', nome: 'CloudHost', status: 'ativo' },
  { id: 'f-09', nome: 'OfficeMax', status: 'ativo' },
  { id: 'f-10', nome: 'Seguros Forte', status: 'ativo' },
  { id: 'f-11', nome: 'Metais Premium', status: 'ativo' },
  { id: 'f-12', nome: 'CleanService', status: 'ativo' },
  { id: 'f-13', nome: 'Alimenta Bem', status: 'ativo' },
  { id: 'f-14', nome: 'Transportadora SP', status: 'ativo' },
  { id: 'f-15', nome: 'HardwarePro', status: 'bloqueado' },
];

const CATEGORIAS_RECEITA = ['Venda de Produtos', 'Serviços', 'Assinaturas', 'Licenciamento'];
const CATEGORIAS_DESPESA = [
  'Salários e Encargos', 'Energia', 'Aluguel', 'Material de Escritório',
  'Manutenção', 'Marketing Digital', 'Logística', 'Consultoria',
  'Software e Licenças', 'Telecomunicações', 'Tributos', 'Fornecedores',
];
const GRUPOS_CAPEX = ['Equipamentos', 'Software', 'Obra Civil', 'Veículos', 'Móveis e Utensílios'];
const RESPONSAVEIS = [
  'Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Martins', 'Eliane Costa',
  'Felipe Nunes', 'Gisele Alves', 'Hugo Ribeiro', 'Iris Maia', 'Joao Pinto',
];
const CLIENTES = [
  'Cliente Alpha', 'Cliente Beta', 'Cliente Gamma', 'Cliente Delta', 'Cliente Epsilon',
  'Cliente Zeta', 'Cliente Eta', 'Cliente Theta',
];
const STATUS_LANC = ['Aprovado', 'Pendente', 'Conciliado', 'Em Análise'];
const CONTAS_CONTABEIS = ['1.01', '2.02.01', '3.01.04', '4.02', '5.01.02', '6.03.01', '7.01'];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

let counter = 0;
function id(prefix: string) {
  counter += 1;
  return `${prefix}-${counter.toString().padStart(5, '0')}`;
}

function genRecord(ano: number, mes: number): FactRecord {
  const empresa = pick(EMPRESAS).nome;
  const tipo = pick<TipoMovimento>(['RECEITA', 'OPEX', 'CAPEX', 'DESPESA', 'OPEX', 'RECEITA', 'DESPESA']);
  const dia = Math.floor(rand(1, 28));
  const baseValor = tipo === 'RECEITA' ? rand(8_000, 180_000) : rand(1_200, 95_000);

  const isImobilizado = tipo === 'CAPEX';
  const depreciacao = isImobilizado ? baseValor * rand(0.08, 0.18) : undefined;

  const budget = tipo !== 'RECEITA' ? baseValor * rand(0.85, 1.25) : undefined;
  const realizado = tipo !== 'RECEITA' ? baseValor : undefined;
  const forecast = tipo !== 'RECEITA' ? baseValor * rand(0.9, 1.15) : undefined;

  const categoria =
    tipo === 'RECEITA'
      ? pick(CATEGORIAS_RECEITA)
      : tipo === 'CAPEX'
        ? pick(GRUPOS_CAPEX)
        : pick(CATEGORIAS_DESPESA);

  const grupo =
    tipo === 'CAPEX' ? 'Investimentos' : tipo === 'RECEITA' ? 'Receitas' : 'Despesas Operacionais';
  const subgrupo =
    tipo === 'OPEX' ? 'Operacional' : tipo === 'CAPEX' ? 'Imobilizado' : tipo === 'RECEITA' ? 'Receita Líquida' : 'Administrativo';

  return {
    id: id('rec'),
    empresa,
    loja: pick(LOJAS),
    centroCusto: pick(CENTROS_CUSTO),
    contaContabil: pick(CONTAS_CONTABEIS),
    projeto: Math.random() < 0.35 ? pick(PROJETOS_NOMES) : undefined,
    fornecedor: tipo !== 'RECEITA' ? pick(FORNECEDORES).nome : undefined,
    cliente: tipo === 'RECEITA' ? pick(CLIENTES) : undefined,
    documento: `NF-${ano}${pad(mes)}-${Math.floor(rand(100, 9999))}`,
    notaFiscal: `${Math.floor(rand(10000, 99999))}/${pad(mes)}`,
    data: `${ano}-${pad(mes)}-${pad(dia)}`,
    ano,
    mes,
    categoria,
    grupo,
    subgrupo,
    valor: tipo === 'RECEITA' ? baseValor : -Math.abs(baseValor),
    quantidade: Math.floor(rand(1, 120)),
    status: pick(STATUS_LANC),
    responsavel: pick(RESPONSAVEIS),
    tipoMovimento: tipo,
    budget,
    realizado,
    forecast,
    imobilizado: isImobilizado || undefined,
    depreciacao,
    sourceFile: 'mock_dataset_v1.xlsx',
    importedAt: `${ano}-01-01T08:00:00Z`,
  };
}

const PROJETOS_NOMES = [
  'Projeto Alpha', 'Projeto Beta', 'Projeto Sigma', 'Projeto Ômega',
  'Projeto Delta', 'Projeto Fênix', 'Projeto Aurora', 'Projeto Nimbus',
];

export function generateProjetos(): Projeto[] {
  const base = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addMonths = (date: Date, m: number) => {
    const nd = new Date(date);
    nd.setMonth(nd.getMonth() + m);
    return nd;
  };
  return PROJETOS_NOMES.map((nome, i) => {
    const status: Projeto['status'] =
      i === 1 ? 'atrasado' : i === 5 ? 'parado' : i === 7 ? 'concluido' : 'em_andamento';
    return {
      id: `prj-${pad(i + 1)}`,
      nome,
      empresa: pick(EMPRESAS).nome,
      responsavel: pick(RESPONSAVEIS),
      inicio: iso(addMonths(base, -rand(3, 10) | 0)),
      fim: iso(addMonths(base, rand(0, 6) | 0)),
      status,
      orcamento: rand(150_000, 1_200_000),
    };
  });
}

export function generateMockDataset(): FactRecord[] {
  counter = 0;
  const records: FactRecord[] = [];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (let i = 0; i < 12; i++) {
    const ano = anoAtual - i;
    const perMonth = ano === anoAtual ? hoje.getMonth() + 1 : 12;
    for (let m = 1; m <= perMonth; m++) {
      const count = Math.floor(rand(140, 200));
      for (let k = 0; k < count; k++) records.push(genRecord(ano, m));
    }
    void meses;
  }
  return records;
}

export const MOCK_EMPRESAS = EMPRESAS;
export const MOCK_LOJAS = LOJAS;
export const MOCK_CENTROS_CUSTO = CENTROS_CUSTO;
export const MOCK_FORNECEDORES = FORNECEDORES.map((f) => f.nome);
export const MOCK_CATEGORIAS = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA, ...GRUPOS_CAPEX];
export const MOCK_RESPONSAVEIS = RESPONSAVEIS;
