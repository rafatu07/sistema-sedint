import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  onSnapshot,
  writeBatch,
  increment,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';

import { db, auth, storage, COLLECTIONS, STORAGE_FOLDERS } from './firebase';
import type {
  FirebaseUser,
  FirebaseProcess,
  FirebaseProcessHistory,
  QueryOptions,
  PaginatedResult,
  LoginCredentials,
  RegisterCredentials,
  FileUpload,
  UploadedFile,
  ProcessStatistics,
  UnsubscribeFunction,
  SubscriptionCallback,
} from '@/types/firebase';
import type { User } from '@/types/process';

// ===================================
// SERVIÇOS DE AUTENTICAÇÃO
// ===================================

export const authService = {
  // Login com email e senha
  async login({ email, password }: LoginCredentials): Promise<FirebaseAuthUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  // Registro de novo usuário
  async register({ email, password, name, role = 'user' }: RegisterCredentials): Promise<void> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Atualizar perfil com nome
    await updateProfile(result.user, { displayName: name });
    
    // Criar documento do usuário no Firestore usando o UID como ID do documento
    const userRef = doc(db, COLLECTIONS.USERS, result.user.uid);
    await setDoc(userRef, {
      uid: result.user.uid,
      email,
      name,
      role,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      is_active: true,
    } as Omit<FirebaseUser, 'id'>);
    
    console.log('Usuário salvo no Firestore:', result.user.uid);
  },

  // Logout
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Redefinir senha
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  // Observer de estado de autenticação
  onAuthStateChanged(callback: (user: FirebaseAuthUser | null) => void): UnsubscribeFunction {
    return onAuthStateChanged(auth, callback);
  },

  // Obter usuário atual
  getCurrentUser(): FirebaseAuthUser | null {
    return auth.currentUser;
  },

  // Alterar senha do usuário
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuário não está logado');
    }

    // Reautenticar o usuário com a senha atual
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Alterar a senha
    await updatePassword(user, newPassword);
  },
};

// ===================================
// SERVIÇOS DE USUÁRIO
// ===================================

export const userService = {
  // Obter dados do usuário por UID
  async getUserByUid(uid: string): Promise<FirebaseUser | null> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      console.log('Usuário não encontrado no Firestore:', uid);
      return null;
    }
    
    const userData = docSnap.data() as Omit<FirebaseUser, 'id'>;
    console.log('Usuário encontrado no Firestore:', userData.name);
    return { id: docSnap.id, ...userData };
  },

  // Atualizar dados do usuário
  async updateUser(userId: string, data: Partial<FirebaseUser>): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...data,
      updated_at: Timestamp.now(),
    });
  },

  // Listar todos os usuários (apenas admin)
  async getAllUsers(): Promise<FirebaseUser[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseUser[];
  },
};

// ===================================
// SERVIÇOS DE PROCESSO
// ===================================

export const processService = {
  // Criar processo
  async createProcess(processData: Omit<FirebaseProcess, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PROCESSES), {
      ...processData,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    
    // Registrar no histórico
    await this.addToHistory({
      process_id: docRef.id,
      action: 'created',
      new_values: firebaseUtils.sanitizeForHistory(processData),
      updated_by: processData.created_by,
      updated_at: Timestamp.now(),
    });
    
    return docRef.id;
  },

  // Obter processo por ID
  async getProcessById(id: string): Promise<FirebaseProcess | null> {
    const docRef = doc(db, COLLECTIONS.PROCESSES, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as FirebaseProcess;
  },

  // Atualizar processo
  async updateProcess(id: string, data: Partial<FirebaseProcess>): Promise<void> {
    const processRef = doc(db, COLLECTIONS.PROCESSES, id);
    const oldData = await this.getProcessById(id);
    
    await updateDoc(processRef, {
      ...data,
      updated_at: Timestamp.now(),
    });

    // Registrar no histórico
    if (oldData) {
      await this.addToHistory({
        process_id: id,
        action: 'updated',
        old_values: firebaseUtils.sanitizeForHistory(oldData),
        new_values: firebaseUtils.sanitizeForHistory({ ...oldData, ...data }),
        updated_by: data.updated_by || 'system',
        updated_at: Timestamp.now(),
      });
    }
  },

  // Excluir processo
  async deleteProcess(id: string): Promise<void> {
    const processRef = doc(db, COLLECTIONS.PROCESSES, id);
    await deleteDoc(processRef);
    
    // Registrar no histórico
    await this.addToHistory({
      process_id: id,
      action: 'deleted',
      old_values: {},
      new_values: {},
      updated_by: 'system',
      updated_at: Timestamp.now(),
    });
  },

  // Listar processos com paginação e filtros
  async getProcesses(options: QueryOptions = {}): Promise<PaginatedResult<FirebaseProcess>> {
    let q = query(collection(db, COLLECTIONS.PROCESSES));

    // Aplicar filtros
    if (options.where) {
      options.where.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    // Aplicar ordenação
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction));
    }

    // Aplicar paginação
    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    const processes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseProcess[];

    return {
      data: processes,
      hasMore: snapshot.docs.length === (options.limit || processes.length),
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  },

  // Escutar mudanças em processos em tempo real
  subscribeToProcesses(
    callback: SubscriptionCallback<FirebaseProcess>,
    options: QueryOptions = {}
  ): UnsubscribeFunction {
    let q = query(collection(db, COLLECTIONS.PROCESSES));

    // Aplicar filtros
    if (options.where) {
      options.where.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction));
    }

    return onSnapshot(q, (snapshot) => {
      const processes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseProcess[];
      callback(processes);
    });
  },

  // Adicionar ao histórico
  async addToHistory(historyData: Omit<FirebaseProcessHistory, 'id'>): Promise<void> {
    // Remover valores undefined antes de salvar
    const cleanData = firebaseUtils.removeUndefined(historyData);
    await addDoc(collection(db, COLLECTIONS.PROCESS_HISTORY), cleanData);
  },

  // Criar Timestamp - helper
  createTimestamp(): Timestamp {
    return Timestamp.now();
  },

  // Obter histórico de um processo
  async getProcessHistory(processId: string): Promise<FirebaseProcessHistory[]> {
    const q = query(
      collection(db, COLLECTIONS.PROCESS_HISTORY),
      where('process_id', '==', processId)
    );

    const snapshot = await getDocs(q);
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseProcessHistory[];

    // Ordenar por data no JavaScript para evitar índice composto
    return history.sort((a, b) => {
      const dateA = a.updated_at?.toDate?.() || new Date(0);
      const dateB = b.updated_at?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
    });
  },

  // Obter último andamento de um processo
  async getLatestProgressUpdate(processId: string): Promise<FirebaseProcessHistory | null> {
    const q = query(
      collection(db, COLLECTIONS.PROCESS_HISTORY),
      where('process_id', '==', processId),
      where('action', '==', 'progress_update')
    );

    const snapshot = await getDocs(q);
    const progressUpdates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseProcessHistory[];

    // Ordenar por data e retornar o mais recente
    const sortedUpdates = progressUpdates.sort((a, b) => {
      const dateA = a.updated_at?.toDate?.() || new Date(0);
      const dateB = b.updated_at?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
    });

    return sortedUpdates.length > 0 ? sortedUpdates[0] : null;
  },

  // Obter estatísticas
  async getStatistics(): Promise<ProcessStatistics> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.PROCESSES));
    const processes = snapshot.docs.map(doc => doc.data()) as FirebaseProcess[];

    const stats = {
      total: processes.length,
      pendente: 0,
      em_andamento: 0,
      concluido: 0,
      cancelado: 0,
      by_priority: {
        baixa: 0,
        media: 0,
        alta: 0,
      },
      by_user: {} as Record<string, number>,
      by_location: {} as Record<string, number>,
      completion_rate: 0,
      average_completion_time_days: 0,
    };

    processes.forEach(process => {
      // Contar por status
      stats[process.status]++;
      
      // Contar por prioridade
      stats.by_priority[process.prioridade]++;
      
      // Contar por usuário responsável
      if (process.responsavel) {
        stats.by_user[process.responsavel] = (stats.by_user[process.responsavel] || 0) + 1;
      }
      
      // Contar por local
      stats.by_location[process.local] = (stats.by_location[process.local] || 0) + 1;
    });

    // Calcular taxa de conclusão
    stats.completion_rate = stats.total > 0 ? (stats.concluido / stats.total) * 100 : 0;

    // TODO: Calcular tempo médio de conclusão

    return stats;
  },
};

// ===================================
// SERVIÇOS DE ARQUIVOS
// ===================================

export const fileService = {
  // Fazer upload de arquivo
  async uploadFile({ file, path, metadata }: FileUpload): Promise<UploadedFile> {
    const storageRef = ref(storage, path);
    
    const uploadResult = await uploadBytes(storageRef, file, {
      customMetadata: {
        uploaded_by: metadata?.uploaded_by || 'unknown',
        process_id: metadata?.process_id || '',
        description: metadata?.description || '',
      },
    });

    const downloadURL = await getDownloadURL(uploadResult.ref);
    const fileMetadata = await getMetadata(uploadResult.ref);

    return {
      id: uploadResult.ref.fullPath,
      name: file.name,
      size: file.size,
      type: file.type,
      url: downloadURL,
      path: uploadResult.ref.fullPath,
      uploaded_at: Timestamp.now(),
      uploaded_by: metadata?.uploaded_by || 'unknown',
      process_id: metadata?.process_id,
      description: metadata?.description,
    };
  },

  // Excluir arquivo
  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  },

  // Obter URL de download
  async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  },

  // Gerar caminho para arquivo de processo
  generateProcessFilePath(processId: string, filename: string): string {
    const timestamp = Date.now();
    return `${STORAGE_FOLDERS.PROCESSES}/${processId}/${timestamp}_${filename}`;
  },

  // Gerar caminho para avatar
  generateAvatarPath(userId: string, filename: string): string {
    return `${STORAGE_FOLDERS.AVATARS}/${userId}/${filename}`;
  },
};

// ===================================
// SERVIÇOS DE BATCH
// ===================================

export const batchService = {
  // Executar operações em batch
  async executeBatch(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: Record<string, unknown>;
  }>): Promise<void> {
    const batch = writeBatch(db);

    operations.forEach(op => {
      switch (op.type) {
        case 'create':
          if (op.collection && op.data) {
            const docRef = doc(collection(db, op.collection));
            batch.set(docRef, {
              ...op.data,
              created_at: Timestamp.now(),
              updated_at: Timestamp.now(),
            });
          }
          break;
        
        case 'update':
          if (op.collection && op.id && op.data) {
            const docRef = doc(db, op.collection, op.id);
            batch.update(docRef, {
              ...op.data,
              updated_at: Timestamp.now(),
            });
          }
          break;
        
        case 'delete':
          if (op.collection && op.id) {
            const docRef = doc(db, op.collection, op.id);
            batch.delete(docRef);
          }
          break;
      }
    });

    await batch.commit();
  },
};

// Utilitários para conversão de dados
export const firebaseUtils = {
  // Converter Timestamp para Date
  timestampToDate(timestamp: Timestamp): Date {
    return timestamp.toDate();
  },

  // Converter Date para Timestamp
  dateToTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  },

  // Remover valores undefined de um objeto para evitar erros do Firebase
  removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    const cleaned: Record<string, unknown> = {};
    for (const key in obj) {
      const value = obj[key];
      
      // Pular valores undefined
      if (value === undefined) {
        continue;
      }
      
      // Se é um objeto, aplicar recursivamente
      if (value !== null && typeof value === 'object' && !value.toDate) {
        cleaned[key] = this.removeUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  },

  // Converter processo do Firebase para formato local
  convertFirebaseProcess(firebaseProcess: FirebaseProcess): Record<string, unknown> {
    return {
      ...firebaseProcess,
      created_at: firebaseProcess.created_at.toDate().toISOString(),
      updated_at: firebaseProcess.updated_at.toDate().toISOString(),
      due_date: firebaseProcess.due_date?.toDate().toISOString(),
      completed_at: firebaseProcess.completed_at?.toDate().toISOString(),
    };
  },

  // Sanitizar dados para histórico (converter Timestamps para strings)
  sanitizeForHistory(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized: Record<string, unknown> = {};
    for (const key in data) {
      const value = data[key];
      
      // Se é um Timestamp do Firebase, converter para string ISO
      if (value && typeof value === 'object' && value.toDate) {
        try {
          sanitized[key] = value.toDate().toISOString();
        } catch {
          sanitized[key] = String(value);
        }
      }
      // Se é null, undefined ou uma primitiva, manter como está
      else if (value === null || value === undefined || typeof value !== 'object') {
        sanitized[key] = value;
      }
      // Se é objeto, recursivamente sanitizar
      else {
        sanitized[key] = this.sanitizeForHistory(value);
      }
    }
    
    return sanitized;
  },
};
