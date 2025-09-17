// Tipos para o sistema CRM

export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
  site?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface Contato {
  id: string;
  empresa_id: string;
  nome: string;
  cargo?: string;
  telefone?: string;
  celular?: string;
  email: string;
  departamento?: string;
  observacoes?: string;
  is_principal: boolean; // Contato principal da empresa
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type RelevanciaInfo = 'baixa' | 'media' | 'alta' | 'critica';

export interface LogInformacao {
  id: string;
  empresa_id: string;
  contato_id?: string; // Opcional - pode estar relacionado a um contato específico
  titulo: string;
  descricao: string;
  relevancia: RelevanciaInfo;
  categoria: string; // Ex: 'comercial', 'técnico', 'financeiro', 'jurídico', etc.
  data_ocorrencia: string; // Data em que a informação ocorreu
  data_registro: string; // Data em que foi registrada no sistema
  anexos?: string[]; // URLs dos anexos (futuro)
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Tipos para formulários
export interface EmpresaFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
  site?: string;
  observacoes?: string;
}

export interface ContatoFormData {
  empresa_id: string;
  nome: string;
  cargo?: string;
  telefone?: string;
  celular?: string;
  email: string;
  departamento?: string;
  observacoes?: string;
  is_principal: boolean;
}

export interface LogInformacaoFormData {
  empresa_id: string;
  contato_id?: string;
  titulo: string;
  descricao: string;
  relevancia: RelevanciaInfo;
  categoria: string;
  data_ocorrencia: string;
  anexos?: string[];
}

// Tipos para listagens e filtros
export interface EmpresaWithContatos extends Empresa {
  contatos: Contato[];
  total_contatos: number;
  ultimo_log?: LogInformacao;
}

export interface ContatoWithEmpresa extends Contato {
  empresa: Empresa;
}

export interface LogWithDetails extends LogInformacao {
  empresa: Empresa;
  contato?: Contato;
}

// Filtros
export interface EmpresaFilters {
  search?: string;
  estado?: string;
  cidade?: string;
  relevancia?: RelevanciaInfo;
}

export interface ContatoFilters {
  search?: string;
  empresa_id?: string;
  departamento?: string;
  is_principal?: boolean;
}

export interface LogFilters {
  search?: string;
  empresa_id?: string;
  contato_id?: string;
  relevancia?: RelevanciaInfo;
  categoria?: string;
  data_inicio?: string;
  data_fim?: string;
}

// Estatísticas do CRM
export interface CRMStats {
  total_empresas: number;
  total_contatos: number;
  total_logs: number;
  empresas_por_estado: { [estado: string]: number };
  logs_por_relevancia: { [relevancia in RelevanciaInfo]: number };
  logs_por_categoria: { [categoria: string]: number };
  contatos_principais: number;
  empresas_recentes: number; // Últimos 30 dias
}
