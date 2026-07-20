/**
 * Script de migração/seed: Supabase -> Firestore
 *
 * Como usar:
 *   1. Gere uma chave de conta de serviço no Firebase Console:
 *      Configurações do projeto > Contas de serviço > Gerar nova chave privada
 *   2. Salve como ./serviceAccountKey.json (NÃO faça commit deste arquivo)
 *   3. Instale as dependências:  npm install firebase-admin
 *   4. Execute:  node scripts/migrar-para-firestore.js
 *
 * Este script cria TODAS as coleções no Firestore com os dados extraídos
 * do Supabase, e pode ser executado quantas vezes quiser (idempotente
 * para CMS, acrescenta registros para as demais coleções).
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, writeBatch, doc, setDoc, collection } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf-8'),
);

const app = getApps().length
  ? initializeApp({ credential: cert(serviceAccount) })
  : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ---- Dados extraídos do Supabase (executado em 2026-07-19) ----

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
  hero_titulo: 'Defesa jurídica com dedicação e proximidade',
  hero_subtitulo: 'Atuação humanizada e técnica em Direito de Família, Civil, Trabalhista, Previdenciário, Empresarial e Penal.',
  hero_botao: 'Agendar consulta',
  sobre_titulo: 'Sobre Dra. Patricia Cristiane Serejo',
  sobre_texto: 'Com anos de experiência e compromisso com a ética e a excelência, Dra. Patricia Cristiane Serejo atua na defesa dos direitos de seus clientes com proximidade, transparência e resultados. O escritório prioriza o atendimento personalizado, mantendo cada cliente informado em cada etapa do processo.',
  contato_telefone: '(11) 95408-4156',
  contato_whatsapp: '5511954084156',
  contato_email: 'contato@patriciaserejo.adv.br',
  contato_endereco: 'Rua Paulo Barreto de Almeida, 123 — Monte Mor/SP',
  contato_horario: 'Seg. a Sex. das 9h às 18h',
  rodape_texto: 'Patricia Cristiane Serejo Advocacia — OAB/UF 000.000',
  instagram_url: '',
  linkedin_url: '',
};

async function migrar() {
  const agora = Timestamp.now();

  // areas_atuacao
  for (const a of areasAtuacao) {
    const ref = doc(collection(db, 'areas_atuacao'));
    await setDoc(ref, { ...a, criado_em: agora });
    console.log('area criada:', ref.id, a.titulo);
  }

  // depoimentos
  for (const d of depoimentos) {
    const ref = doc(collection(db, 'depoimentos'));
    await setDoc(ref, { ...d, criado_em: agora });
    console.log('depoimento criado:', ref.id, d.nome);
  }

  // conteudo_site (usa chave como id do doc)
  const batch = writeBatch(db);
  for (const [chave, valor] of Object.entries(conteudoSite)) {
    batch.set(doc(db, 'conteudo_site', chave), { chave, valor, atualizado_em: agora });
  }
  await batch.commit();
  console.log('conteudo_site migrado:', Object.keys(conteudoSite).length, 'chaves');

  console.log('\nMigração concluída com sucesso!');
  console.log('As coleções perfis, clientes, processos, movimentacoes, documentos, mensagens, compromissos, logs_acesso e consentimentos_lgpd estavam vazias no Supabase — elas serão criadas automaticamente pelo app conforme os dados forem cadastrados no Firebase.');
  process.exit(0);
}

migrar().catch((e) => { console.error(e); process.exit(1); });
