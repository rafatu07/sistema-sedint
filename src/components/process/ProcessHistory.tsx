import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Clock, User, Edit, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProcessHistory as ProcessHistoryType } from '@/types/process';
import { createDateFromString } from '@/lib/utils';

interface ProcessHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: ProcessHistoryType[];
  processTitle: string;
  loading?: boolean;
}

const actionConfig = {
  created: {
    label: 'Processo criado',
    icon: Plus,
    color: 'bg-success/10 text-success'
  },
  updated: {
    label: 'Processo atualizado',
    icon: Edit,
    color: 'bg-info/10 text-info'
  },
  status_changed: {
    label: 'Status alterado',
    icon: RotateCcw,
    color: 'bg-warning/10 text-warning'
  },
  progress_update: {
    label: 'Andamento lançado',
    icon: Clock,
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  }
};

export function ProcessHistory({ isOpen, onClose, history, processTitle, loading = false }: ProcessHistoryProps) {
  const formatChanges = (oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) => {
    if (!oldValues || !newValues) return null;

    const formatValue = (value: unknown) => {
      // Se é um Timestamp do Firebase, converter para string
      if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
        try {
          const date = new Date(value.seconds * 1000);
          return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
        } catch {
          return 'Data inválida';
        }
      }
      
      // Se é uma data ISO string, formatá-la
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        try {
          const date = new Date(value);
          return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
        } catch {
          return value;
        }
      }

      // Se é null, undefined ou string vazia
      if (value === null || value === undefined || value === '') {
        return 'vazio';
      }

      // Converter para string
      return String(value);
    };

    const changes = [];
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push({
          field: key,
          from: formatValue(oldValues[key]),
          to: formatValue(newValues[key])
        });
      }
    }
    return changes;
  };

  const getFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      titulo: 'Título',
      descricao: 'Descrição',
      status: 'Status',
      local: 'Local',
      prioridade: 'Prioridade',
      responsavel: 'Responsável',
      data: 'Data'
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico do Processo</DialogTitle>
          <DialogDescription>{processTitle}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum histórico encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const action = actionConfig[entry.action];
                const ActionIcon = action.icon;
                const changes = formatChanges(entry.old_values, entry.new_values);

                return (
                  <div key={entry.id} className="relative">
                    {index < history.length - 1 && (
                      <div className="absolute left-4 top-12 bottom-0 w-px bg-border" />
                    )}
                    
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${action.color}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{action.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{entry.updated_by}</span>
                        </div>

                        {/* Exibição especial para lançamento de andamento */}
                        {entry.action === 'progress_update' && entry.new_values && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                            <p className="text-sm font-medium text-blue-900">Detalhes do Andamento:</p>
                            <div className="text-sm text-blue-800">
                              {entry.new_values.data && (
                                <div><strong>Data:</strong> {createDateFromString(entry.new_values.data).toLocaleDateString('pt-BR')}</div>
                              )}
                              {entry.new_values.local && (
                                <div><strong>Local:</strong> {entry.new_values.local}</div>
                              )}
                              {entry.new_values.montou_processo !== undefined && (
                                <div><strong>Montou processo:</strong> {entry.new_values.montou_processo ? 'Sim' : 'Não'}</div>
                              )}
                              {entry.new_values.numero_processo && (
                                <div><strong>Número do processo:</strong> 
                                  <span className="ml-1 px-2 py-1 bg-blue-100 rounded font-mono text-xs">
                                    {entry.new_values.numero_processo}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Exibição padrão de alterações para outras ações */}
                        {entry.action !== 'progress_update' && changes && changes.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <p className="text-sm font-medium">Alterações:</p>
                            {changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="text-sm">
                                <span className="font-medium">{getFieldLabel(change.field)}:</span>
                                <div className="ml-2 text-muted-foreground">
                                  <span className="line-through">{change.from}</span>
                                  <span className="mx-2">→</span>
                                  <span className="text-foreground font-medium">{change.to}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.notes && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-900 mb-1">Observações:</p>
                            <p className="text-sm text-green-800">{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {index < history.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}