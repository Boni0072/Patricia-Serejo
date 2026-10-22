/**
 * Verificação das regras de segurança de `testemunhas` no emulador do Firestore.
 *
 * Uso:
 *   npx firebase-tools emulators:exec --only firestore,auth --project demo-test \
 *     "node scripts/verificar-regras-testemunhas.mjs"
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, getAuth,
} from 'firebase/auth';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const PROJECT_ID = 'demo-test';

const CLIENTE_A = 'cliente_a';
const CLIENTE_B = 'cliente_b';

const USUARIOS = {
  'uid-admin': 'admin@teste.com',
  'uid-adv': 'advogado@teste.com',
  'uid-a': 'clientea@teste.com',
  'uid-b': 'clienteb@teste.com',
};

let falhas = 0;
let total = 0;

function check(nome, ok) {
  total += 1;
  console.log(`  ${ok ? 'OK  ' : 'FALHA'} ${nome}`);
  if (!ok) falhas += 1;
}

/** `get` negado pelo Firestore lança erro; nesse caso o dado NÃO é visível. */
async function podeLer(db, caminho) {
  try {
    const s = await getDoc(doc(db, ...caminho));
    return s.exists();
  } catch {
    return false;
  }
}

/**
 * Cria (se necessário) e autentica o usuário no emulador do Auth,
 * retornando `{ db, uid }` com o Firestore conectado ao emulador.
 */
async function ctx(uid, papel) {
  const email = USUARIOS[uid];
  const app = initializeApp(
    { projectId: PROJECT_ID, apiKey: 'fake-api-key' },
    `ctx-${uid}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });

  const senha = 'senha-teste-123';
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, senha);
  } catch {
    // usuário já existe — segue para o login
    cred = await signInWithEmailAndPassword(auth, email, senha);
  }
  const realUid = cred.user.uid;

  const db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);

  // Cada usuário cria o próprio perfil (regra: create só no próprio uid).
  await setDoc(doc(db, 'perfis', realUid), { papel, nome: email });

  return { db, uid: realUid };
}

async function main() {
  // 1) Admin (cria o próprio perfil -> ganha acesso total)
  const { db: adm, uid: uidAdmin } = await ctx('uid-admin', 'admin');

  // 2) Demais perfis
  const a = await ctx('uid-a', 'cliente');
  const b = await ctx('uid-b', 'cliente');
  const adv = await ctx('uid-adv', 'advogado');

  const uidA = a.uid;
  const uidB = b.uid;

  // 3) Clientes e processos (gravados pelo admin)
  await setDoc(doc(adm, 'clientes', CLIENTE_A), { user_id: uidA, nome: 'Cliente A' });
  await setDoc(doc(adm, 'clientes', CLIENTE_B), { user_id: uidB, nome: 'Cliente B' });
  await setDoc(doc(adm, 'processos', 'proc_a'), { cliente_id: CLIENTE_A, titulo: 'Processo A' });
  await setDoc(doc(adm, 'processos', 'proc_b'), { cliente_id: CLIENTE_B, titulo: 'Processo B' });

  // 4) Testemunhas
  await setDoc(doc(adm, 'testemunhas', 'test_a_ativa'), {
    processo_id: 'proc_a', nome: 'Testemunha Ativa', ativo: true,
  });
  await setDoc(doc(adm, 'testemunhas', 'test_a_inativa'), {
    processo_id: 'proc_a', nome: 'Testemunha Inativa', ativo: false,
  });
  await setDoc(doc(adm, 'testemunhas', 'test_b_ativa'), {
    processo_id: 'proc_b', nome: 'Testemunha de B', ativo: true,
  });

  const cA = a.db;
  const advDb = adv.db;

  console.log('\n== Leitura ==');
  check('cliente A lê testemunha ativa do seu processo',
    await podeLer(cA, ['testemunhas', 'test_a_ativa']));

  check('cliente A NÃO lê testemunha inativa',
    !(await podeLer(cA, ['testemunhas', 'test_a_inativa'])));

  check('cliente A NÃO lê testemunha do cliente B',
    !(await podeLer(cA, ['testemunhas', 'test_b_ativa'])));

  check('advogado lê testemunha de qualquer processo',
    await podeLer(advDb, ['testemunhas', 'test_b_ativa']));

  check('admin lê testemunha inativa',
    await podeLer(adm, ['testemunhas', 'test_a_inativa']));

  console.log('\n== Listagem (query) ==');
  let q = query(collection(cA, 'testemunhas'),
    where('processo_id', '==', 'proc_a'), where('ativo', '==', true));
  let docs = await getDocs(q);
  check('cliente A lista 1 testemunha ativa do seu processo', docs.size === 1);

  // Cliente A NÃO pode listar testemunhas de outro processo (query negada).
  let listouAlheio = false;
  try {
    q = query(collection(cA, 'testemunhas'), where('processo_id', '==', 'proc_b'));
    docs = await getDocs(q);
    listouAlheio = docs.size > 0;
  } catch {
    listouAlheio = false; // query negada = sem acesso
  }
  check('cliente A NÃO lista testemunhas do cliente B', !listouAlheio);

  console.log('\n== Criação ==');
  const ref = await addDoc(collection(cA, 'testemunhas'), {
    processo_id: 'proc_a', nome: 'Nova Testemunha', ativo: true,
  });
  check('cliente A cria testemunha no seu processo', !!ref.id);

  let falhou = false;
  try {
    await addDoc(collection(cA, 'testemunhas'), {
      processo_id: 'proc_b', nome: 'Invadida', ativo: true,
    });
  } catch { falhou = true; }
  check('cliente A NÃO cria testemunha em processo alheio', falhou);

  falhou = false;
  try {
    await addDoc(collection(cA, 'testemunhas'), {
      processo_id: 'proc_a', nome: 'Inativa', ativo: false,
    });
  } catch { falhou = true; }
  check('cliente A NÃO cria testemunha já inativa', falhou);

  console.log('\n== Atualização ==');
  await updateDoc(doc(cA, 'testemunhas', 'test_a_ativa'), { nome: 'Nome Editado' });
  let snap = await getDoc(doc(adm, 'testemunhas', 'test_a_ativa'));
  check('cliente A edita a testemunha do seu processo', snap.data().nome === 'Nome Editado');

  falhou = false;
  try {
    await updateDoc(doc(cA, 'testemunhas', 'test_b_ativa'), { nome: 'Invadido' });
  } catch { falhou = true; }
  check('cliente A NÃO edita testemunha alheia', falhou);

  await updateDoc(doc(cA, 'testemunhas', 'test_a_ativa'), { ativo: false });
  snap = await getDoc(doc(adm, 'testemunhas', 'test_a_ativa'));
  check('cliente A desativa (soft delete) a propria testemunha', snap.data().ativo === false);

  falhou = false;
  try {
    await updateDoc(doc(cA, 'testemunhas', 'test_a_ativa'), { ativo: true });
  } catch { falhou = true; }
  check('cliente A NÃO reativa testemunha', falhou);

  falhou = false;
  try {
    await updateDoc(doc(cA, 'testemunhas', 'test_a_ativa'), { processo_id: 'proc_b' });
  } catch { falhou = true; }
  check('cliente A NÃO move a testemunha para outro processo', falhou);

  console.log('\n== Exclusão ==');
  falhou = false;
  try {
    await deleteDoc(doc(cA, 'testemunhas', 'test_a_inativa'));
  } catch { falhou = true; }
  check('cliente A NÃO exclui (hard delete) testemunha', falhou);

  await deleteDoc(doc(adm, 'testemunhas', 'test_b_ativa'));
  snap = await getDoc(doc(adm, 'testemunhas', 'test_b_ativa'));
  check('admin exclui (hard delete) testemunha', !snap.exists());

  console.log(`\n${total - falhas}/${total} verificacoes passaram.`);
  if (falhas > 0) {
    console.error(`${falhas} FALHA(S)`);
    process.exit(1);
  }
  console.log('TODAS AS REGRAS DE TESTEMUNHAS PASSARAM');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERRO:', e);
    process.exit(1);
  });

