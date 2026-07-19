import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCHO2mjM_045MepRThq-SI5ka1f_axpxKA",
  authDomain: "peanel.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "peanel",
  storageBucket: "peanel.firebasestorage.app",
  messagingSenderId: "125075701874",
  appId: "1:125075701874:web:d134c0ac8b5fbc47a702eb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Instância secundária usada para criar contas de autenticação de outros
// usuários sem encerrar a sessão do administrador atual. createUserWithEmail
// loga automaticamente o novo usuário; usar uma app isolada evita isso.
const secondaryApp: FirebaseApp = initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);
