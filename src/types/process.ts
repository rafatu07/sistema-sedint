export interface Process {
  id: string;
  titulo: string;
  descricao?: string;
  data: string;
  local: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  prioridade: 'baixa' | 'media' | 'alta';
  responsavel?: string;
  numero_processo?: string; // Número do processo quando montado (ex: "13.548/25")
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface ProcessHistory {
  id: string;
  process_id: string;
  action: 'created' | 'updated' | 'status_changed' | 'progress_update';
  old_values?: Partial<Process>;
  new_values: Partial<Process & { montou_processo?: boolean }>;
  updated_by: string;
  updated_at: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  telefone?: string;
  endereco?: string;
}

export type StatusColor = {
  pendente: 'warning';
  em_andamento: 'info';
  concluido: 'success';
  cancelado: 'destructive';
};

export type PriorityColor = {
  baixa: 'muted';
  media: 'warning';
  alta: 'destructive';
};