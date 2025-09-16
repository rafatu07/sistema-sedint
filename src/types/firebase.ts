import { Timestamp, DocumentReference } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

// Tipos base do Firebase
export interface FirebaseDocument {
  id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Extensões dos tipos existentes para Firebase
export interface FirebaseUser extends Omit<import('./process').User, 'id'> {
  uid: string; // Firebase UID
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login?: Timestamp;
  is_active: boolean;
  profile_image_url?: string;
  telefone?: string | null;
  endereco?: string | null;
}

export interface FirebaseProcess extends Omit<import('./process').Process, 'id' | 'created_at' | 'updated_at'> {
  id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string; // UID do usuário que criou
  assigned_users?: string[]; // UIDs dos usuários atribuídos
  attachments?: DocumentReference[]; // Referências para documentos anexados
  tags?: string[]; // Tags para categorização
  due_date?: Timestamp; // Data de vencimento
  completed_at?: Timestamp; // Data de conclusão
}

export interface FirebaseProcessHistory extends Omit<import('./process').ProcessHistory, 'id' | 'updated_at'> {
  id: string;
  updated_at: Timestamp;
  user_agent?: string; // Informações do navegador/device
  ip_address?: string; // IP do usuário (para auditoria)
}

export interface FirebaseNotification extends FirebaseDocument {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  read_at?: Timestamp;
  action_url?: string;
  metadata?: Record<string, any>;
}

// Tipos para upload de arquivos
export interface FileUpload {
  file: File;
  path: string;
  metadata?: {
    process_id?: string;
    uploaded_by: string;
    description?: string;
  };
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploaded_at: Timestamp;
  uploaded_by: string;
  process_id?: string;
  description?: string;
}

// Tipos para autenticação
export interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  role?: 'admin' | 'user'; // Opcional pois será sempre definido como 'admin' automaticamente
}

// Tipos para queries do Firestore
export interface QueryOptions {
  limit?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  where?: {
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains';
    value: any;
  }[];
  startAfter?: any;
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: any;
  total?: number;
}

// Tipos para estatísticas
export interface ProcessStatistics {
  total: number;
  pendente: number;
  em_andamento: number;
  concluido: number;
  cancelado: number;
  by_priority: {
    baixa: number;
    media: number;
    alta: number;
  };
  by_user: Record<string, number>;
  by_location: Record<string, number>;
  completion_rate: number;
  average_completion_time_days: number;
}

export interface UserStatistics {
  total_processes: number;
  active_processes: number;
  completed_processes: number;
  average_response_time_hours: number;
  performance_score: number;
}

// Tipos para configurações do sistema
export interface SystemConfig {
  maintenance_mode: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  notification_settings: {
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
  };
  backup_settings: {
    enabled: boolean;
    frequency_hours: number;
    retention_days: number;
  };
}

// Tipos para logs de auditoria
export interface AuditLog extends FirebaseDocument {
  user_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout';
  resource_type: 'process' | 'user' | 'file' | 'system';
  resource_id: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Tipos para real-time subscriptions
export type SubscriptionCallback<T> = (data: T[]) => void;
export type UnsubscribeFunction = () => void;

export interface RealtimeOptions {
  includeMetadata?: boolean;
  source?: 'default' | 'server' | 'cache';
}

// Tipos para batch operations
export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id: string;
  data?: any;
}

export interface BatchResult {
  success: boolean;
  operations_completed: number;
  total_operations: number;
  errors?: string[];
}

// Tipos para backup e restore
export interface BackupData {
  timestamp: Timestamp;
  version: string;
  collections: {
    processes: FirebaseProcess[];
    process_history: FirebaseProcessHistory[];
    users: FirebaseUser[];
    notifications: FirebaseNotification[];
  };
  metadata: {
    total_documents: number;
    backup_size_mb: number;
    checksum: string;
  };
}

export interface RestoreOptions {
  overwrite_existing: boolean;
  collections_to_restore: string[];
  validate_before_restore: boolean;
}

// Helpers para conversão de tipos
export type ConvertTimestamp<T> = {
  [K in keyof T]: T[K] extends Timestamp ? Date : T[K];
};

export type FirebaseToLocal<T> = ConvertTimestamp<Omit<T, 'id'> & { id: string }>;

// Enum para estados de conexão
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Interface para status de sincronização
export interface SyncStatus {
  state: ConnectionState;
  lastSync?: Timestamp;
  pendingOperations: number;
  errors: string[];
}
