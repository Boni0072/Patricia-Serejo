/**
 * Script de seed: envia os dados extraídos do Supabase para o Firestore
 * usando a REST API do Firebase (não requer firebase-admin nem service account).
 *
 * Uso:  node scripts/seed-firestore-rest.mjs
 *
 * Os dados abaixo foram extraídos diretamente do banco Supabase em 2026-07-19.
 * Apenas 3 tabelas tinham conteúdo (areas_atuacao, depoimentos, conteudo_site);
 * as demais estavam vazias e serão criadas pelo app conforme os dados forem cadastrados.
 */
const API_KEY = process.env.FIREBASE_API_KEY || '';
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'site-patricia-b5dff';
if (!API_KEY) { console.error('Defina FIREBASE_API_KEY no ambiente.'); process.exit(1); }
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ---- Dados extraídos do Supabase (2026-07-19) ----

const areasAtuacao = [
  { titulo: 'Direito de Família', descricao: 'Divórcio, guarda de filhos, pensão alimentícia, inventários e partilha de bens com sensibilidade e técnica jurídica.', icone: 'Users', ordem: 1, ativo: true },
  { titulo: 'Direito Civil', descricao: 'Contratos, responsabilidade civil, indenizações, direitos do consumidor e questões patrimoniais em geral.', icone: 'FileText', ordem: 2, ativo: true },
  { titulo: 'Direito do Trabalho', descricao: 'Atuação tanto para empregados quanto empregadores em reclamações trabalhistas, rescisões e acordos.', icone: 'Briefcase', ordem: 3, ativo: true },
  { titulo: 'Direito Previdenciário', descricao: 'Aposentadorias, benefícios do INSS, revisões, BPC/LOAS e planejamento previdenciário personalizado.', icone: 'HeartPulse', ordem: 4, ativo: true },
  { titulo: 'Direito Empresarial', descricao: 'Constituição de empresas, contratos comerciais, recuperação judicial e assessoria jurídica preventiva.', icone: 'Building2', ordem: 5, ativo: true },
  { titulo: 'Direito Penal', descricao: 'Defesa em processos penais, inquéritos policiais, audiências de custódia e acompanhamento em delegacias.', icone: 'Gavel', ordem: 6, ativo: true },
];

const depoimentos = [
  { nome: 'Maria S.', texto: 'Atendimento atencioso e muito profissional. Fui acompanhada em todo o processo de divórcio com clareza e segurança.', cargo: 'Cliente — Direito de Família', ordem: 1, ativo: true },
  { nome: 'João P.', texto: 'Resolvi um problema trabalhista com excelência. Comunicação clara e sempre disponível para tirar dúvidas.', cargo: 'Cliente — Direito do Trabalho', ordem: 2, ativo: true },
  { nome: 'Carlos L.', texto: 'Consegui meu benefício do INSS após anos de negativas. Equipe dedicada e competente.', cargo: 'Cliente — Direito Previdenciário', ordem: 3, ativo: true },
];

const conteudoSite = {
  contato_email: 'contato@patriciaserejo.adv.br',
  contato_endereco: 'Rua Paulo Barreto de Almeida, 123 — Monte Mor/SP',
  contato_horario: 'Seg. a Sex. das 9h às 18h',
  contato_telefone: '(11) 95408-4156',
  contato_whatsapp: '5511954084156',
  hero_botao: 'Agendar consulta',
  hero_subtitulo: 'Atuação humanizada e técnica em Direito de Família, Civil, Trabalhista, Previdenciário, Empresarial e Penal.',
  hero_titulo: 'Defesa jurídica com dedicação e proximidade',
  instagram_url: '',
  linkedin_url: '',
  rodape_texto: 'Patricia Cristiane Serejo Advocacia — OAB/UF 000.000',
  sobre_texto: 'Com anos de experiência e compromisso com a ética e a excelência, Dra. Patricia Cristiane Serejo atua na defesa dos direitos de seus clientes com proximidade, transparência e resultados. O escritório prioriza o atendimento personalizado, mantendo cada cliente informado em cada etapa do processo.',
  sobre_titulo: 'Sobre Dra. Patricia Cristiane Serejo',
};

// ---- Helpers REST ----

function ts() {
  return { timestampValue: new Date().toISOString() };
}
function str(v) {
  return { stringValue: String(v ?? '') };
}
function bool(v) {
  return { booleanValue: !!v };
}
function num(v) {
  return { integerValue: Number(v) };
}

async function createDoc(collection, fields) {
  const body = { fields };
  const res = await fetch(`${BASE}/${collection}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${collection} falhou (${res.status}): ${txt}`);
  }
  const data = await res.json();
  return data.name.split('/').pop();
}

async function setDoc(collection, docId, fields) {
  const body = { fields };
  const res = await fetch(`${BASE}/${collection}/${docId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH ${collection}/${docId} falhou (${res.status}): ${txt}`);
  }
  return docId;
}

async function run() {
  console.log('Seeding Firestore (REST API)...');

  console.log('\n[1/3] areas_atuacao:');
  for (const a of areasAtuacao) {
    const id = await createDoc('areas_atuacao', {
      titulo: str(a.titulo),
      descricao: str(a.descricao),
      icone: str(a.icone),
      ordem: num(a.ordem),
      ativo: bool(a.ativo),
      criado_em: ts(),
    });
    console.log('  -', id, a.titulo);
  }

  console.log('\n[2/3] depoimentos:');
  for (const d of depoimentos) {
    const id = await createDoc('depoimentos', {
      nome: str(d.nome),
      texto: str(d.texto),
      cargo: str(d.cargo),
      ordem: num(d.ordem),
      ativo: bool(d.ativo),
      criado_em: ts(),
    });
    console.log('  -', id, d.nome);
  }

  console.log('\n[3/3] conteudo_site:');
  for (const [chave, valor] of Object.entries(conteudoSite)) {
    await setDoc('conteudo_site', chave, {
      chave: str(chave),
      valor: str(valor),
      atualizado_em: ts(),
    });
    console.log('  -', chave);
  }

  console.log('\nMigração concluída com sucesso!');
  console.log('As demais coleções (perfis, clientes, processos, etc.) estavam vazias no Supabase e serão criadas pelo app conforme os dados forem cadastrados.');
}

run().catch((e) => { console.error(e); process.exit(1); });
