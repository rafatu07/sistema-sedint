import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  FirebaseEmpresa, 
  FirebaseContato, 
  FirebaseLogInformacao,
  QueryOptions,
  PaginatedResult,
  SubscriptionCallback
} from '@/types/firebase';
import { 
  Empresa, 
  Contato, 
  LogInformacao, 
  EmpresaFormData, 
  ContatoFormData, 
  LogInformacaoFormData,
  EmpresaFilters,
  ContatoFilters,
  LogFilters,
  CRMStats
} from '@/types/crm';

// Utilitários para conversão de timestamps
const timestampToDate = (timestamp: Timestamp): Date => timestamp.toDate();
const dateToTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);
const createTimestamp = (): Timestamp => serverTimestamp() as Timestamp;

// Serviço para gerenciar empresas
export const empresaService = {
  // Criar nova empresa
  async createEmpresa(empresaData: EmpresaFormData, userId: string): Promise<string> {
    try {
      const firebaseEmpresaData: Omit<FirebaseEmpresa, 'id'> = {
        ...empresaData,
        created_by: userId,
        updated_by: userId,
        created_at: createTimestamp(),
        updated_at: createTimestamp(),
        status: 'ativa',
        ultima_atividade: createTimestamp()
      };

      const docRef = await addDoc(collection(db, 'empresas'), firebaseEmpresaData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      throw new Error('Erro ao criar empresa');
    }
  },

  // Buscar empresa por ID
  async getEmpresaById(id: string): Promise<Empresa | null> {
    try {
      const docRef = doc(db, 'empresas', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as FirebaseEmpresa;
      return this.convertFirebaseEmpresaToLocal({ id: docSnap.id, ...data });
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      throw new Error('Erro ao buscar empresa');
    }
  },

  // Atualizar empresa
  async updateEmpresa(id: string, empresaData: Partial<EmpresaFormData>, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'empresas', id);
      const updateData = {
        ...empresaData,
        updated_by: userId,
        updated_at: createTimestamp(),
        ultima_atividade: createTimestamp()
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      throw new Error('Erro ao atualizar empresa');
    }
  },

  // Excluir empresa com auditoria
  async deleteEmpresa(id: string, userId: string, userEmail: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // 1. Buscar empresa para auditoria
      const empresaRef = doc(db, 'empresas', id);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        throw new Error('Empresa não encontrada');
      }
      
      const empresaData = empresaDoc.data() as FirebaseEmpresa;
      
      // 2. Buscar contatos relacionados
      const contatosQuery = query(
        collection(db, 'contatos'),
        where('empresa_id', '==', id)
      );
      const contatosSnapshot = await getDocs(contatosQuery);
      
      // 3. Buscar logs relacionados
      const logsQuery = query(
        collection(db, 'logs_informacao'),
        where('empresa_id', '==', id)
      );
      const logsSnapshot = await getDocs(logsQuery);
      
      // 4. Deletar contatos
      contatosSnapshot.docs.forEach(contatoDoc => {
        batch.delete(contatoDoc.ref);
      });
      
      // 5. Deletar logs
      logsSnapshot.docs.forEach(logDoc => {
        batch.delete(logDoc.ref);
      });
      
      // 6. Deletar empresa
      batch.delete(empresaRef);
      
      // 7. Criar registro de auditoria
      const auditoriaRef = doc(collection(db, 'auditoria'));
      batch.set(auditoriaRef, {
        tipo: 'exclusao_empresa',
        empresa_id: id,
        empresa_nome: empresaData.nome_fantasia,
        empresa_cnpj: empresaData.cnpj,
        contatos_excluidos: contatosSnapshot.docs.length,
        logs_excluidos: logsSnapshot.docs.length,
        usuario_id: userId,
        usuario_email: userEmail,
        data_exclusao: createTimestamp(),
        detalhes: {
          razao_social: empresaData.razao_social,
          endereco: empresaData.endereco,
          telefone: empresaData.telefone,
          email: empresaData.email,
          site: empresaData.site,
          observacoes: empresaData.observacoes
        }
      });
      
      // 8. Executar batch
      await batch.commit();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      throw new Error('Erro ao excluir empresa');
    }
  },

  // Listar empresas com filtros
  async getEmpresas(options: QueryOptions = {}): Promise<PaginatedResult<Empresa>> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (options.where) {
        options.where.forEach(condition => {
          constraints.push(where(condition.field, condition.operator, condition.value));
        });
      }

      if (options.orderBy) {
        constraints.push(orderBy(options.orderBy.field, options.orderBy.direction));
      } else {
        constraints.push(orderBy('updated_at', 'desc'));
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(collection(db, 'empresas'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const empresas = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseEmpresa;
        return this.convertFirebaseEmpresaToLocal({ id: doc.id, ...data });
      });

      return {
        data: empresas,
        hasMore: querySnapshot.docs.length === (options.limit || 0),
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      throw new Error('Erro ao listar empresas');
    }
  },

  // Buscar empresas com filtros específicos do CRM
  async searchEmpresas(filters: EmpresaFilters, userId: string): Promise<Empresa[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('created_by', '==', userId)
      ];

      if (filters.estado) {
        constraints.push(where('endereco.estado', '==', filters.estado));
      }

      if (filters.cidade) {
        constraints.push(where('endereco.cidade', '==', filters.cidade));
      }

      constraints.push(orderBy('updated_at', 'desc'));

      const q = query(collection(db, 'empresas'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      let empresas = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseEmpresa;
        return this.convertFirebaseEmpresaToLocal({ id: doc.id, ...data });
      });

      // Filtro de busca por texto (fazido no cliente)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        empresas = empresas.filter(empresa => 
          empresa.razao_social.toLowerCase().includes(searchTerm) ||
          empresa.nome_fantasia.toLowerCase().includes(searchTerm) ||
          empresa.cnpj.includes(searchTerm)
        );
      }

      return empresas;
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      throw new Error('Erro ao buscar empresas');
    }
  },

  // Listener em tempo real para empresas
  subscribeToEmpresas(
    callback: SubscriptionCallback<Empresa>,
    options: QueryOptions = {}
  ): () => void {
    const constraints: QueryConstraint[] = [];
    
    if (options.where) {
      options.where.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }

    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction));
    } else {
      constraints.push(orderBy('updated_at', 'desc'));
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(db, 'empresas'), ...constraints);
    
    return onSnapshot(q, (querySnapshot) => {
      const empresas = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseEmpresa;
        return this.convertFirebaseEmpresaToLocal({ id: doc.id, ...data });
      });
      callback(empresas);
    });
  },

  // Converter empresa do Firebase para formato local
  convertFirebaseEmpresaToLocal(firebaseEmpresa: FirebaseEmpresa): Empresa {
    return {
      id: firebaseEmpresa.id,
      cnpj: firebaseEmpresa.cnpj,
      razao_social: firebaseEmpresa.razao_social,
      nome_fantasia: firebaseEmpresa.nome_fantasia,
      endereco: firebaseEmpresa.endereco,
      telefone: firebaseEmpresa.telefone,
      email: firebaseEmpresa.email,
      site: firebaseEmpresa.site,
      observacoes: firebaseEmpresa.observacoes,
      created_at: timestampToDate(firebaseEmpresa.created_at).toISOString(),
      updated_at: timestampToDate(firebaseEmpresa.updated_at).toISOString(),
      created_by: firebaseEmpresa.created_by,
      updated_by: firebaseEmpresa.updated_by
    };
  }
};

// Serviço para gerenciar contatos
export const contatoService = {
  // Criar novo contato
  async createContato(contatoData: ContatoFormData, userId: string): Promise<string> {
    try {
      const firebaseContatoData: Omit<FirebaseContato, 'id'> = {
        ...contatoData,
        created_by: userId,
        updated_by: userId,
        created_at: createTimestamp(),
        updated_at: createTimestamp(),
        status: 'ativo',
        ultima_comunicacao: createTimestamp()
      };

      const docRef = await addDoc(collection(db, 'contatos'), firebaseContatoData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw new Error('Erro ao criar contato');
    }
  },

  // Buscar contato por ID
  async getContatoById(id: string): Promise<Contato | null> {
    try {
      const docRef = doc(db, 'contatos', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as FirebaseContato;
      return this.convertFirebaseContatoToLocal({ id: docSnap.id, ...data });
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      throw new Error('Erro ao buscar contato');
    }
  },

  // Atualizar contato
  async updateContato(id: string, contatoData: Partial<ContatoFormData>, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'contatos', id);
      const updateData = {
        ...contatoData,
        updated_by: userId,
        updated_at: createTimestamp(),
        ultima_comunicacao: createTimestamp()
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      throw new Error('Erro ao atualizar contato');
    }
  },

  // Excluir contato
  async deleteContato(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'contatos', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      throw new Error('Erro ao excluir contato');
    }
  },

  // Listar contatos por empresa
  async getContatosByEmpresa(empresaId: string): Promise<Contato[]> {
    try {
      const q = query(
        collection(db, 'contatos'),
        where('empresa_id', '==', empresaId),
        orderBy('is_principal', 'desc'),
        orderBy('nome', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseContato;
        return this.convertFirebaseContatoToLocal({ id: doc.id, ...data });
      });
    } catch (error) {
      console.error('Erro ao listar contatos da empresa:', error);
      throw new Error('Erro ao listar contatos da empresa');
    }
  },

  // Buscar contatos com filtros
  async searchContatos(filters: ContatoFilters, userId: string): Promise<Contato[]> {
    try {
      const constraints: QueryConstraint[] = [];

      if (filters.empresa_id) {
        constraints.push(where('empresa_id', '==', filters.empresa_id));
      }

      if (filters.departamento) {
        constraints.push(where('departamento', '==', filters.departamento));
      }

      if (filters.is_principal !== undefined) {
        constraints.push(where('is_principal', '==', filters.is_principal));
      }

      constraints.push(orderBy('nome', 'asc'));

      const q = query(collection(db, 'contatos'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      let contatos = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseContato;
        return this.convertFirebaseContatoToLocal({ id: doc.id, ...data });
      });

      // Filtro de busca por texto (feito no cliente)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        contatos = contatos.filter(contato => 
          contato.nome.toLowerCase().includes(searchTerm) ||
          contato.email.toLowerCase().includes(searchTerm) ||
          contato.cargo?.toLowerCase().includes(searchTerm) ||
          contato.departamento?.toLowerCase().includes(searchTerm)
        );
      }

      return contatos;
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      throw new Error('Erro ao buscar contatos');
    }
  },

  // Converter contato do Firebase para formato local
  convertFirebaseContatoToLocal(firebaseContato: FirebaseContato): Contato {
    return {
      id: firebaseContato.id,
      empresa_id: firebaseContato.empresa_id,
      nome: firebaseContato.nome,
      cargo: firebaseContato.cargo,
      telefone: firebaseContato.telefone,
      celular: firebaseContato.celular,
      email: firebaseContato.email,
      departamento: firebaseContato.departamento,
      observacoes: firebaseContato.observacoes,
      is_principal: firebaseContato.is_principal,
      created_at: timestampToDate(firebaseContato.created_at).toISOString(),
      updated_at: timestampToDate(firebaseContato.updated_at).toISOString(),
      created_by: firebaseContato.created_by,
      updated_by: firebaseContato.updated_by
    };
  }
};

// Serviço para gerenciar auditoria
export const auditoriaService = {
  // Buscar registros de auditoria
  async getAuditoria(options: QueryOptions = {}): Promise<PaginatedResult<Record<string, unknown>>> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (options.where) {
        options.where.forEach((w) => {
          constraints.push(where(w.field, w.operator, w.value));
        });
      }
      
      if (options.orderBy) {
        constraints.push(orderBy(options.orderBy.field, options.orderBy.direction));
      }
      
      if (options.limit) {
        constraints.push(limit(options.limit));
      }
      
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(collection(db, 'auditoria'), ...constraints);
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          data_exclusao: docData.data_exclusao ? timestampToDate(docData.data_exclusao).toISOString() : null
        };
      });

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      const hasMore = options.limit ? querySnapshot.docs.length === options.limit : false;

      return { data, hasMore, lastDoc };
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
      throw new Error('Erro ao buscar registros de auditoria');
    }
  },

  // Buscar exclusões de empresas
  async getExclusoesEmpresas(userId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.getAuditoria({
        where: [
          { field: 'tipo', operator: '==', value: 'exclusao_empresa' },
          { field: 'usuario_id', operator: '==', value: userId }
        ],
        orderBy: { field: 'data_exclusao', direction: 'desc' }
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar exclusões de empresas:', error);
      throw new Error('Erro ao buscar exclusões de empresas');
    }
  }
};

// Serviço para gerenciar logs de informação
export const logInformacaoService = {
  // Criar novo log
  async createLog(logData: LogInformacaoFormData, userId: string): Promise<string> {
    try {
      const firebaseLogData: Omit<FirebaseLogInformacao, 'id'> = {
        ...logData,
        data_ocorrencia: dateToTimestamp(new Date(logData.data_ocorrencia)),
        data_registro: createTimestamp(),
        created_by: userId,
        updated_by: userId,
        created_at: createTimestamp(),
        updated_at: createTimestamp(),
        is_private: false,
        anexos: logData.anexos || []
      };

      const docRef = await addDoc(collection(db, 'logs_informacao'), firebaseLogData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar log de informação:', error);
      throw new Error('Erro ao criar log de informação');
    }
  },

  // Buscar log por ID
  async getLogById(id: string): Promise<LogInformacao | null> {
    try {
      const docRef = doc(db, 'logs_informacao', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as FirebaseLogInformacao;
      return this.convertFirebaseLogToLocal({ id: docSnap.id, ...data });
    } catch (error) {
      console.error('Erro ao buscar log de informação:', error);
      throw new Error('Erro ao buscar log de informação');
    }
  },

  // Atualizar log
  async updateLog(id: string, logData: Partial<LogInformacaoFormData>, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'logs_informacao', id);
      const updateData: Record<string, unknown> = {
        ...logData,
        updated_by: userId,
        updated_at: createTimestamp()
      };

      if (logData.data_ocorrencia) {
        updateData.data_ocorrencia = dateToTimestamp(new Date(logData.data_ocorrencia));
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Erro ao atualizar log de informação:', error);
      throw new Error('Erro ao atualizar log de informação');
    }
  },

  // Excluir log
  async deleteLog(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'logs_informacao', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erro ao excluir log de informação:', error);
      throw new Error('Erro ao excluir log de informação');
    }
  },

  // Listar logs por empresa
  async getLogsByEmpresa(empresaId: string): Promise<LogInformacao[]> {
    try {
      const q = query(
        collection(db, 'logs_informacao'),
        where('empresa_id', '==', empresaId),
        orderBy('data_ocorrencia', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseLogInformacao;
        return this.convertFirebaseLogToLocal({ id: doc.id, ...data });
      });
    } catch (error) {
      console.error('Erro ao listar logs da empresa:', error);
      throw new Error('Erro ao listar logs da empresa');
    }
  },

  // Buscar logs com filtros
  async searchLogs(filters: LogFilters, userId: string): Promise<LogInformacao[]> {
    try {
      const constraints: QueryConstraint[] = [];

      if (filters.empresa_id) {
        constraints.push(where('empresa_id', '==', filters.empresa_id));
      }

      if (filters.contato_id) {
        constraints.push(where('contato_id', '==', filters.contato_id));
      }

      if (filters.relevancia) {
        constraints.push(where('relevancia', '==', filters.relevancia));
      }

      if (filters.categoria) {
        constraints.push(where('categoria', '==', filters.categoria));
      }

      constraints.push(orderBy('data_ocorrencia', 'desc'));

      const q = query(collection(db, 'logs_informacao'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      let logs = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseLogInformacao;
        return this.convertFirebaseLogToLocal({ id: doc.id, ...data });
      });

      // Filtros de data (feito no cliente)
      if (filters.data_inicio) {
        const dataInicio = new Date(filters.data_inicio);
        logs = logs.filter(log => new Date(log.data_ocorrencia) >= dataInicio);
      }

      if (filters.data_fim) {
        const dataFim = new Date(filters.data_fim);
        logs = logs.filter(log => new Date(log.data_ocorrencia) <= dataFim);
      }

      // Filtro de busca por texto (feito no cliente)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        logs = logs.filter(log => 
          log.titulo.toLowerCase().includes(searchTerm) ||
          log.descricao.toLowerCase().includes(searchTerm) ||
          log.categoria.toLowerCase().includes(searchTerm)
        );
      }

      return logs;
    } catch (error) {
      console.error('Erro ao buscar logs de informação:', error);
      throw new Error('Erro ao buscar logs de informação');
    }
  },

  // Converter log do Firebase para formato local
  convertFirebaseLogToLocal(firebaseLog: FirebaseLogInformacao): LogInformacao {
    return {
      id: firebaseLog.id,
      empresa_id: firebaseLog.empresa_id,
      contato_id: firebaseLog.contato_id,
      titulo: firebaseLog.titulo,
      descricao: firebaseLog.descricao,
      relevancia: firebaseLog.relevancia,
      categoria: firebaseLog.categoria,
      data_ocorrencia: timestampToDate(firebaseLog.data_ocorrencia).toISOString(),
      data_registro: timestampToDate(firebaseLog.data_registro).toISOString(),
      anexos: firebaseLog.anexos,
      created_at: timestampToDate(firebaseLog.created_at).toISOString(),
      updated_at: timestampToDate(firebaseLog.updated_at).toISOString(),
      created_by: firebaseLog.created_by,
      updated_by: firebaseLog.updated_by
    };
  }
};

// Serviço para estatísticas do CRM
export const crmStatsService = {
  // Buscar estatísticas gerais do CRM
  async getCRMStats(userId: string): Promise<CRMStats> {
    try {
      // Buscar todas as empresas do usuário
      const empresasQuery = query(
        collection(db, 'empresas'),
        where('created_by', '==', userId)
      );
      const empresasSnapshot = await getDocs(empresasQuery);
      const empresas = empresasSnapshot.docs.map(doc => doc.data() as FirebaseEmpresa);

      // Buscar todos os contatos das empresas
      const contatosQuery = query(
        collection(db, 'contatos'),
        where('created_by', '==', userId)
      );
      const contatosSnapshot = await getDocs(contatosQuery);
      const contatos = contatosSnapshot.docs.map(doc => doc.data() as FirebaseContato);

      // Buscar todos os logs
      const logsQuery = query(
        collection(db, 'logs_informacao'),
        where('created_by', '==', userId)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => doc.data() as FirebaseLogInformacao);

      // Calcular estatísticas
      const empresasPorEstado: { [estado: string]: number } = {};
      const logsPorRelevancia: { [relevancia: string]: number } = {};
      const logsPorCategoria: { [categoria: string]: number } = {};

      empresas.forEach(empresa => {
        const estado = empresa.endereco.estado;
        empresasPorEstado[estado] = (empresasPorEstado[estado] || 0) + 1;
      });

      logs.forEach(log => {
        logsPorRelevancia[log.relevancia] = (logsPorRelevancia[log.relevancia] || 0) + 1;
        logsPorCategoria[log.categoria] = (logsPorCategoria[log.categoria] || 0) + 1;
      });

      const contatosPrincipais = contatos.filter(contato => contato.is_principal).length;
      
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const empresasRecentes = empresas.filter(empresa => 
        timestampToDate(empresa.created_at) >= trintaDiasAtras
      ).length;

      return {
        total_empresas: empresas.length,
        total_contatos: contatos.length,
        total_logs: logs.length,
        empresas_por_estado: empresasPorEstado,
        logs_por_relevancia: logsPorRelevancia,
        logs_por_categoria: logsPorCategoria,
        contatos_principais: contatosPrincipais,
        empresas_recentes: empresasRecentes
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do CRM:', error);
      throw new Error('Erro ao buscar estatísticas do CRM');
    }
  }
};
