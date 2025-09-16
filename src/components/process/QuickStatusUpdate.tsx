import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  MessageSquare,
  Calendar,
  MapPin,
  FileText
} from 'lucide-react';
import { Process } from '@/types/process';
import { getTodayForInput } from '@/lib/utils';

interface ProcessUpdateData {
  data: string;
  local: string;
  notes?: string;
  montou_processo?: boolean;
  numero_processo?: string;
}

interface QuickStatusUpdateProps {
  process: Process | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProcess: (processId: string, updateData: ProcessUpdateData) => void;
  isUpdating?: boolean;
}

const statusConfig = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    className: 'text-warning bg-warning/10',
    next: 'em_andamento' as const,
    nextLabel: 'Iniciar Processo'
  },
  em_andamento: {
    label: 'Em Andamento',
    icon: AlertCircle,
    className: 'text-info bg-info/10',
    next: 'concluido' as const,
    nextLabel: 'Marcar como Concluído'
  },
  concluido: {
    label: 'Concluído',
    icon: CheckCircle,
    className: 'text-success bg-success/10',
    next: null,
    nextLabel: null
  },
  cancelado: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'text-destructive bg-destructive/10',
    next: 'pendente' as const,
    nextLabel: 'Reativar Processo'
  }
};

const allStatuses: Process['status'][] = ['pendente', 'em_andamento', 'concluido', 'cancelado'];

export function QuickStatusUpdate({ 
  process, 
  isOpen, 
  onClose, 
  onUpdateProcess, 
  isUpdating = false 
}: QuickStatusUpdateProps) {
  const [updateData, setUpdateData] = useState({
    data: '',
    local: '',
    notes: '',
    montou_processo: false,
    numero_processo: ''
  });

  const initializeForm = React.useCallback(() => {
    if (!process) return;
    
    const today = getTodayForInput();
    setUpdateData({
      data: today,
      local: process.local || '',
      notes: '',
      montou_processo: false,
      numero_processo: ''
    });
  }, [process]);

  // Initialize form when process changes or modal opens
  React.useEffect(() => {
    if (process && isOpen) {
      initializeForm();
    }
  }, [process, isOpen, initializeForm]);

  // Early return AFTER all hooks
  if (!process) return null;

  const currentStatus = statusConfig[process.status];
  const CurrentIcon = currentStatus.icon;

  const isFormValid = () => {
    const hasRequiredFields = updateData.data && updateData.local.trim();
    const hasValidProcessNumber = updateData.montou_processo 
      ? updateData.numero_processo && updateData.numero_processo.trim() 
      : true;
    return hasRequiredFields && hasValidProcessNumber;
  };

  const handleSaveUpdate = () => {
    if (!isFormValid()) return;

    onUpdateProcess(process.id, {
      data: updateData.data,
      local: updateData.local.trim(),
      notes: updateData.notes.trim() || undefined,
      montou_processo: updateData.montou_processo,
      numero_processo: updateData.montou_processo && updateData.numero_processo 
        ? updateData.numero_processo.trim() 
        : undefined
    });
    
    handleClose();
  };

  const handleClose = () => {
    initializeForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lançar Andamento</DialogTitle>
          <DialogDescription>
            {process.titulo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Atual - Apenas Informativo */}
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CurrentIcon className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Lançando andamento para processo</p>
              <Badge className={currentStatus.className}>
                {currentStatus.label}
              </Badge>
            </div>
          </div>

          {/* Campos Obrigatórios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="data" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data *
              </Label>
              <Input
                id="data"
                type="date"
                value={updateData.data}
                onChange={(e) => setUpdateData(prev => ({ ...prev, data: e.target.value }))}
                className={!updateData.data ? "border-red-300" : ""}
              />
            </div>

            {/* Local */}
            <div className="space-y-2">
              <Label htmlFor="local" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Local *
              </Label>
              <Input
                id="local"
                placeholder="Ex: SEFA, Secretaria, etc."
                value={updateData.local}
                onChange={(e) => setUpdateData(prev => ({ ...prev, local: e.target.value }))}
                className={!updateData.local.trim() ? "border-red-300" : ""}
              />
            </div>
          </div>

          {/* Montou Processo */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label htmlFor="montou_processo" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Montou processo?
              </Label>
              <Switch
                id="montou_processo"
                checked={updateData.montou_processo}
                onCheckedChange={(checked) => 
                  setUpdateData(prev => ({ 
                    ...prev, 
                    montou_processo: checked,
                    numero_processo: checked ? prev.numero_processo : ''
                  }))
                }
              />
            </div>

            {updateData.montou_processo && (
              <div className="space-y-2">
                <Label htmlFor="numero_processo" className="text-sm font-medium">
                  Número do processo *
                </Label>
                <Input
                  id="numero_processo"
                  placeholder="Ex: 13.548/25"
                  value={updateData.numero_processo}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, numero_processo: e.target.value }))}
                  className={!updateData.numero_processo?.trim() ? "border-red-300" : ""}
                />
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              O que aconteceu nesta data?
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Protocolado no setor X, aguardando análise, documento entregue..."
              value={updateData.notes}
              onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Validação */}
          {!isFormValid() && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {!updateData.data || !updateData.local.trim() 
                ? 'Preencha a data e o local para continuar' 
                : 'Preencha o número do processo para continuar'
              }
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUpdate} 
              disabled={isUpdating || !isFormValid()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? "Salvando..." : "Salvar Andamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { ProcessUpdateData };
