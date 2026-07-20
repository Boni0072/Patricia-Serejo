/**
 * Cria um usuario administrador no Firebase Auth + perfil (papel='admin')
 * na colecao `perfis` do Firestore, via REST API.
 *
 * Uso: node scripts/create-admin.mjs <email> <senha> [nome]
 *
 * Le VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID do .env.
 * Se o usuario Auth ja existir, entra com as credenciais para obter o
 * idToken e atualiza o perfil para papel='admin'.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT = env.VITE_FIREBASE_PROJECT_ID;
const [email, senha, nome = 'Administrador'] = process.argv.slice(2);

if (!API_KEY || !PROJECT) {
  console.error('Variaveis VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID ausentes no .env');
  process.exit(1);
}
if (!email || !senha) {
  console.error('Uso: node scripts/create-admin.mjs <email> <senha> [nome]');
  process.exit(1);
}
if (senha.length < 6) {
  console.error('A senha deve ter ao menos 6 caracteres (minimo do Firebase).');
  process.exit(1);
}

const IDENTITY = `https://identitytoolkit.googleapis.com/v1`;
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function signUp() {
  const res = await fetch(`${IDENTITY}/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  });
  const data = await res.json();
  if (res.ok) return { data, created: true };
  const msg = data.error?.message ?? JSON.stringify(data);
  if (msg.includes('EMAIL_EXISTS')) return { data: await signIn(), created: false };
  throw new Error(`signUp falhou (${res.status}): ${msg}`);
}

async function signIn() {
  const res = await fetch(`${IDENTITY}/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? JSON.stringify(data);
    throw new Error(`signIn falhou (${res.status}): ${msg}`);
  }
  return data;
}

async function setPerfil(uid, idToken) {
  const now = new Date().toISOString();
  const fields = {
    nome: { stringValue: nome },
    email: { stringValue: email },
    papel: { stringValue: 'admin' },
    telefone: { nullValue: null },
    cpf: { nullValue: null },
    criado_em: { timestampValue: now },
    atualizado_em: { timestampValue: now },
  };
  const res = await fetch(`${FIRESTORE}/perfis/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const data = await res.json();
    const msg = data.error?.message ?? JSON.stringify(data);
    throw new Error(`setPerfil falhou (${res.status}): ${msg}`);
  }
}

async function run() {
  console.log(`Projeto: ${PROJECT}`);
  console.log(`Criando admin: ${email}`);
  const { data: auth, created } = await signUp();
  console.log(created ? '  Usuario Auth criado.' : '  Usuario Auth ja existia — perfil sera atualizado.');
  console.log('  uid:', auth.localId);
  await setPerfil(auth.localId, auth.idToken);
  console.log('  Perfil admin gravado em perfis/' + auth.localId);
  console.log('\nConcluido. Faca login em /login?area=admin');
}

run().catch((e) => { console.error(e); process.exit(1); });
