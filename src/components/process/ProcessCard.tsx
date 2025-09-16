import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  MapPin, 
  MoreHorizontal, 
  Edit, 
  History, 
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Process, ProcessHistory } from '@/types/process';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createDateFromString } from '@/lib/utils';

interface ProcessCardProps {
  process: Process;
  latestProgress?: ProcessHistory | null;
  onEdit: (process: Process) => void;
  onDelete: (processId: string) => void;
  onViewHistory: (processId: string) => void;
  onQuickStatusUpdate: (processId: string) => void;
  onCompleteProcess: (processId: string) => void;
  currentUser: { role: string };
}

const statusConfig = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    variant: 'secondary' as const,
    className: 'text-warning bg-warning/10',
    next: 'em_andamento' as const,
    nextLabel: 'Iniciar',
    nextIcon: ArrowRight
  },
  em_andamento: {
    label: 'Em Andamento',
    icon: AlertCircle,
    variant: 'default' as const,
    className: 'text-info bg-info/10',
    next: 'concluido' as const,
    nextLabel: 'Concluir',
    nextIcon: CheckCircle
  },
  concluido: {
    label: 'Concluído',
    icon: CheckCircle,
    variant: 'default' as const,
    className: 'text-success bg-success/10',
    next: null,
    nextLabel: null,
    nextIcon: null
  },
  cancelado: {
    label: 'Cancelado',
    icon: XCircle,
    variant: 'destructive' as const,
    className: 'text-destructive bg-destructive/10',
    next: 'pendente' as const,
    nextLabel: 'Reativar',
    nextIcon: RefreshCw
  }
};

const priorityConfig = {
  baixa: { label: 'Baixa', className: 'text-muted-foreground bg-muted' },
  media: { label: 'Média', className: 'text-warning bg-warning/10' },
  alta: { label: 'Alta', className: 'text-destructive bg-destructive/10' }
};

export function ProcessCard({ 
  process,
  latestProgress,
  onEdit, 
  onDelete, 
  onViewHistory, 
  onQuickStatusUpdate,
  onCompleteProcess,
  currentUser 
}: ProcessCardProps) {
  const status = statusConfig[process.status];
  const priority = priorityConfig[process.prioridade];
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-elevated transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg leading-tight">{process.titulo}</CardTitle>
            
            {/* Número do Processo - Destaque */}
            {process.numero_processo && (
              <div className="mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                  <FileText className="w-3 h-3 mr-1" />
                  Processo: {process.numero_processo}
                </Badge>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Badge className={status.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className={priority.className}>
                {priority.label}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(process)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {currentUser.role === 'admin' && (
                <DropdownMenuItem 
                  onClick={() => onDelete(process.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Botões de Ação */}
      <div className="px-6 pb-4">
        {process.status === 'em_andamento' && (
          <div className="flex items-center gap-2">
            {/* Botão de Lançamento de Andamento */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onQuickStatusUpdate(process.id)}
              className="flex-1 flex items-center gap-2 text-xs h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4" />
              Lançar Andamento
            </Button>

            {/* Botão de Histórico */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewHistory(process.id)}
              className="flex-shrink-0 w-auto px-3 text-xs h-9 border-gray-200 text-gray-700 hover:bg-gray-50"
              title="Ver Histórico"
            >
              <History className="w-4 h-4" />
            </Button>

            {/* Botão de Concluir Processo */}
            <Button
              size="sm"
              onClick={() => onCompleteProcess(process.id)}
              className="flex-shrink-0 w-auto px-3 text-xs h-9 bg-green-600 hover:bg-green-700 text-white"
              title="Concluir Processo"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      <CardContent className="space-y-4 pt-0">
        {/* Mostrar observações do último andamento OU descrição original */}
        {(latestProgress?.notes || process.descricao) && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {latestProgress?.notes || process.descricao}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{format(createDateFromString(process.data), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{process.local}</span>
          </div>
          
          {process.responsavel && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Responsável: {process.responsavel}</span>
            </div>
          )}
        </div>
        
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Atualizado em {format(new Date(latestProgress?.updated_at || process.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })} por {latestProgress?.updated_by || process.updated_by}
        </div>
      </CardContent>
    </Card>
  );
}