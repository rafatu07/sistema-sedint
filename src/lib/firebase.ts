import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Configuração do Firebase usando variáveis de ambiente ou valores padrão
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCy4g79LGsesTaGqMqS35KlFAV4wrYN_E8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "controle-processos-e4f8a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "controle-processos-e4f8a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "controle-processos-e4f8a.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "530013591248",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:530013591248:web:8f5e3b7f9ae513fb36b7fd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validação das configurações obrigatórias
const requiredConfig = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingConfig = requiredConfig.filter(key => !import.meta.env[key]);
if (missingConfig.length > 0) {
  console.error('Configurações Firebase obrigatórias não encontradas:', missingConfig);
  console.error('Verifique seu arquivo .env.local ou configure as variáveis de ambiente');
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (opcional - apenas em produção)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true' && typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Configuração de emuladores para desenvolvimento local
if (import.meta.env.VITE_ENVIRONMENT === 'development' && typeof window !== 'undefined') {
  // Verificar se já está conectado aos emuladores para evitar erro de reconexão
  try {
    // Auth Emulator
    if (import.meta.env.VITE_USE_AUTH_EMULATOR === 'true' && !auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }

    // Firestore Emulator
    if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }

    // Storage Emulator
    if (import.meta.env.VITE_USE_STORAGE_EMULATOR === 'true') {
      connectStorageEmulator(storage, 'localhost', 9199);
    }

    console.log('🔧 Emuladores Firebase conectados para desenvolvimento');
  } catch (error) {
    // Emuladores já conectados ou erro de conexão
    if (import.meta.env.VITE_ENABLE_FIREBASE_DEBUG === 'true') {
      console.log('ℹ️ Emuladores Firebase já conectados ou erro de conexão:', error);
    }
  }
}

// Configurações de debug
if (import.meta.env.VITE_ENABLE_FIREBASE_DEBUG === 'true') {
  console.log('🔥 Firebase inicializado com sucesso');
  console.log('📊 Projeto:', firebaseConfig.projectId);
  console.log('🌍 Ambiente:', import.meta.env.VITE_ENVIRONMENT);
}

// Coleções do Firestore
export const COLLECTIONS = {
  USERS: import.meta.env.VITE_COLLECTION_USERS || 'users',
  PROCESSES: import.meta.env.VITE_COLLECTION_PROCESSES || 'processes',
  PROCESS_HISTORY: import.meta.env.VITE_COLLECTION_PROCESS_HISTORY || 'process_history',
  NOTIFICATIONS: import.meta.env.VITE_COLLECTION_NOTIFICATIONS || 'notifications',
} as const;

// Configurações do Storage
export const STORAGE_FOLDERS = {
  PROCESSES: import.meta.env.VITE_STORAGE_PROCESSES_FOLDER || 'processes',
  AVATARS: import.meta.env.VITE_STORAGE_AVATARS_FOLDER || 'avatars',
  TEMP: import.meta.env.VITE_STORAGE_TEMP_FOLDER || 'temp',
} as const;

// Configurações do sistema
export const APP_CONFIG = {
  MAX_FILE_SIZE_MB: Number(import.meta.env.VITE_STORAGE_MAX_FILE_SIZE_MB) || 50,
  ALLOWED_EXTENSIONS: import.meta.env.VITE_STORAGE_ALLOWED_EXTENSIONS?.split(',') || 
    ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xlsx'],
  MAX_PROCESSES_PER_USER: Number(import.meta.env.VITE_MAX_PROCESSES_PER_USER) || 100,
  PROCESS_TITLE_MAX_LENGTH: Number(import.meta.env.VITE_PROCESS_TITLE_MAX_LENGTH) || 200,
  PROCESS_DESCRIPTION_MAX_LENGTH: Number(import.meta.env.VITE_PROCESS_DESCRIPTION_MAX_LENGTH) || 2000,
  DEFAULT_PROCESS_STATUS: import.meta.env.VITE_DEFAULT_PROCESS_STATUS as Process['status'] || 'pendente',
  DEFAULT_PROCESS_PRIORITY: import.meta.env.VITE_DEFAULT_PROCESS_PRIORITY as Process['prioridade'] || 'media',
  USER_ROLES: import.meta.env.VITE_USER_ROLES?.split(',') as User['role'][] || ['admin', 'user'],
  ENABLE_AUDIT_LOG: import.meta.env.VITE_ENABLE_AUDIT_LOG === 'true',
  AUDIT_RETENTION_DAYS: Number(import.meta.env.VITE_AUDIT_RETENTION_DAYS) || 365,
} as const;

// Re-exportar tipos para facilitar importação
export type { Process, ProcessHistory, User } from '@/types/process';

export default app;
