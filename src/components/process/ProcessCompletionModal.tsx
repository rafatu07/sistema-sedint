import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Process } from '@/types/process';

interface ProcessCompletionModalProps {
  process: Process | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (processId: string) => void;
  isCompleting?: boolean;
}

export function ProcessCompletionModal({
  process,
  isOpen,
  onClose,
  onConfirm,
  isCompleting = false
}: ProcessCompletionModalProps) {
  if (!process) return null;

  const handleConfirm = () => {
    onConfirm(process.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Concluir Processo
          </DialogTitle>
          <DialogDescription>
            {process.titulo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Confirme a conclusão</p>
              <p>
                Ao confirmar, este processo será marcado como <strong>concluído</strong> e 
                não poderá mais receber novos andamentos.
              </p>
            </div>
          </div>

          {/* Informações do Processo */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Local atual:</span>
              <span className="font-medium">{process.local}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última atualização:</span>
              <span className="font-medium">
                {new Date(process.updated_at).toLocaleDateString('pt-BR')} por {process.updated_by}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isCompleting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCompleting ? (
                "Concluindo..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Conclusão
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
