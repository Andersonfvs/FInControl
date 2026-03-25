import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, onAuthStateChanged } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB8Xc2f1Eyx8KXzQq0NC0u-8QrdG1jxa7o",
  authDomain: "nossas-contas-ed340-v2.firebaseapp.com",
  databaseURL: "https://nossas-contas-ed340-v2-default-rtdb.firebaseio.com",
  projectId: "nossas-contas-ed340-v2",
  storageBucket: "nossas-contas-ed340-v2.firebasestorage.app",
  messagingSenderId: "109907986952",
  appId: "1:109907986952:web:32778a938874f2dd05dfbd"
};

console.log('🔥 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Configurar persistência
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Persistência LOCAL configurada com sucesso!');
  })
  .catch((error) => {
    console.error('❌ ERRO ao configurar persistência:', error);
  });

// Monitor de autenticação
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ Usuário autenticado:', user.email);
      console.log('📦 localStorage disponível:', !!window.localStorage);
      console.log('🔑 Current user:', auth.currentUser?.email);
    } else {
      console.log('❌ Nenhum usuário autenticado');
    }
  });
}