import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, BarChart3, Clock, CheckCircle, AlertCircle, XCircle, Download } from 'lucide-react';
import { ProcessCard } from '@/components/process/ProcessCard';
import { ExcelExportService } from '@/lib/excel-export';
import { ProcessForm } from '@/components/process/ProcessForm';
import { ProcessFilters } from '@/components/process/ProcessFilters';
import { ProcessHistory } from '@/components/process/ProcessHistory';
import { QuickStatusUpdate, ProcessUpdateData } from '@/components/process/QuickStatusUpdate';
import { ProcessCompletionModal } from '@/components/process/ProcessCompletionModal';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Process, ProcessHistory as ProcessHistoryType, User } from '@/types/process';
import { processService } from '@/lib/firebase-services';
import { firebaseUtils } from '@/lib/firebase-services';
import type { FirebaseProcess, FirebaseProcessHistory } from '@/types/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput } from '@/lib/utils';

interface DashboardProps {
  user: User;
}

// Dados reais do Firebase - sem mock

export function Dashboard({ user }: DashboardProps) {
  // Estados principais
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processesWithProgress, setProcessesWithProgress] = useState<Array<{process: Process, latestProgress: ProcessHistoryType | null}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuickStatusOpen, setIsQuickStatusOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [quickUpdateProcess, setQuickUpdateProcess] = useState<Process | null>(null);
  const [completionProcess, setCompletionProcess] = useState<Process | null>(null);
  const [history, setHistory] = useState<ProcessHistoryType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [completingProcess, setCompletingProcess] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localFilter, setLocalFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirmDialog();

  // Função para converter processo do Firebase para formato local
  const convertFirebaseProcessToLocal = (firebaseProcess: FirebaseProcess): Process => {
    return {
      id: firebaseProcess.id,
      titulo: firebaseProcess.titulo,
      descricao: firebaseProcess.descricao,
      data: firebaseProcess.data,
      local: firebaseProcess.local,
      status: firebaseProcess.status,
      prioridade: firebaseProcess.prioridade,
      responsavel: firebaseProcess.responsavel,
      numero_processo: firebaseProcess.numero_processo, // ✅ Incluir número do processo
      created_at: firebaseUtils.timestampToDate(firebaseProcess.created_at).toISOString(),
      updated_at: firebaseUtils.timestampToDate(firebaseProcess.updated_at).toISOString(),
      updated_by: firebaseProcess.updated_by || firebaseProcess.created_by,
    };
  };

  // Carregar processos do Firebase
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadProcesses = () => {
      try {
        setLoading(true);
        setError(null);

        // Configurar listener em tempo real
        unsubscribe = processService.subscribeToProcesses(
          async (firebaseProcesses: FirebaseProcess[]) => {
            console.log('Processos carregados do Firebase:', firebaseProcesses.length);
            
            // Converter processos do Firebase para formato local
            const localProcesses = firebaseProcesses.map(convertFirebaseProcessToLocal);
            setProcesses(localProcesses);
            
            // Buscar último andamento para cada processo
            const processesWithLatestProgress = await Promise.all(
              localProcesses.map(async (process) => {
                try {
                  const latestProgressFirebase = await processService.getLatestProgressUpdate(process.id);
                  let latestProgress: ProcessHistoryType | null = null;
                  
                  if (latestProgressFirebase) {
                    latestProgress = {
                      id: latestProgressFirebase.id,
                      process_id: latestProgressFirebase.process_id,
                      action: latestProgressFirebase.action as ProcessHistoryType['action'],
                      old_values: latestProgressFirebase.old_values,
                      new_values: latestProgressFirebase.new_values,
                      updated_by: latestProgressFirebase.updated_by,
                      updated_at: firebaseUtils.timestampToDate(latestProgressFirebase.updated_at).toISOString(),
                      notes: latestProgressFirebase.notes,
                    };
                  }
                  
                  return { process, latestProgress };
                } catch (err) {
                  console.error(`Erro ao buscar último andamento do processo ${process.id}:`, err);
                  return { process, latestProgress: null };
                }
              })
            );
            
            setProcessesWithProgress(processesWithLatestProgress);
            setLoading(false);
          },
          {
            orderBy: { field: 'updated_at', direction: 'desc' },
            where: [
              { field: 'created_by', operator: '==', value: user.id }
            ]
          }
        );
      } catch (err) {
        console.error('Erro ao carregar processos:', err);
        setError('Erro ao carregar contratos');
        setLoading(false);
        
        toast({
          title: "Erro ao carregar contratos",
          description: "Não foi possível carregar os contratos. Tente novamente.",
          variant: "destructive",
        });
      }
    };

    loadProcesses();

    // Cleanup do listener
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast]);

  // Filter processes with progress
  const filteredProcessesWithProgress = useMemo(() => {
    return processesWithProgress.filter(({ process }) => {
      const matchesSearch = process.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.local.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
      const matchesLocal = localFilter === 'all' || process.local === localFilter;
      const matchesPriority = priorityFilter === 'all' || process.prioridade === priorityFilter;
      const matchesDate = !dateFilter || process.data === formatDateForInput(dateFilter);

      return matchesSearch && matchesStatus && matchesLocal && matchesPriority && matchesDate;
    });
  }, [processesWithProgress, searchTerm, statusFilter, localFilter, priorityFilter, dateFilter]);

  // Filter processes (manter para compatibilidade com estatísticas)
  const filteredProcesses = useMemo(() => {
    return filteredProcessesWithProgress.map(({ process }) => process);
  }, [filteredProcessesWithProgress]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: processes.length,
      pendente: processes.filter(p => p.status === 'pendente').length,
      em_andamento: processes.filter(p => p.status === 'em_andamento').length,
      concluido: processes.filter(p => p.status === 'concluido').length,
      cancelado: processes.filter(p => p.status === 'cancelado').length
    };
  }, [processes]);

  const handleCreateProcess = () => {
    setSelectedProcess(null);
    setIsFormOpen(true);
  };

  const handleEditProcess = (process: Process) => {
    setSelectedProcess(process);
    setIsFormOpen(true);
  };

  const handleQuickStatusUpdate = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (process) {
      setQuickUpdateProcess(process);
      setIsQuickStatusOpen(true);
    }
  };

  const handleCompleteProcess = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (process) {
      setCompletionProcess(process);
      setIsCompletionModalOpen(true);
    }
  };

  // Função para exportar para Excel
  const handleExportToExcel = async () => {
    try {
      setLoading(true);
      
      if (processes.length === 0) {
        toast({
          title: "Nenhum contrato encontrado",
          description: "Não há contratos para exportar.",
          variant: "destructive",
        });
        return;
      }

      // Exportar cada contrato em uma aba
      await ExcelExportService.exportToExcel(processes, 'relatorio_contratos');
      
      toast({
        title: "Exportação concluída!",
        description: `${processes.length} contratos foram exportados para Excel.`,
      });
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro na exportação",
        description: error.message || "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmCompletion = async (processId: string) => {
    try {
      setCompletingProcess(true);

      const firebaseProcessData = {
        status: 'concluido' as Process['status'],
        updated_by: user.name,
      };

      await processService.updateProcess(processId, firebaseProcessData);

      toast({
        title: "Contrato concluído!",
        description: "O contrato foi marcado como concluído com sucesso.",
      });
    } catch (err: any) {
      console.error('Erro ao concluir processo:', err);
      toast({
        title: "Erro ao concluir contrato",
        description: err.message || "Não foi possível concluir o contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCompletingProcess(false);
      setIsCompletionModalOpen(false);
      setCompletionProcess(null);
    }
  };

  const handleQuickUpdateSubmit = async (processId: string, updateData: ProcessUpdateData) => {
    try {
      setUpdatingStatus(true);

      // Se montou processo, atualizar o número no processo principal
      const processRef = doc(db, 'processes', processId);
      const updateProcessData: any = {
        data: updateData.data,
        local: updateData.local,
        updated_by: user.name,
        updated_at: processService.createTimestamp(),
      };

      // Adicionar número do processo se montou processo
      if (updateData.montou_processo && updateData.numero_processo && updateData.numero_processo.trim()) {
        updateProcessData.numero_processo = updateData.numero_processo.trim();
      }

      await updateDoc(processRef, updateProcessData);

      // Preparar dados do histórico (evitando valores undefined)
      const historyData: any = {
        process_id: processId,
        action: 'progress_update',
        old_values: {},
        new_values: {
          data: updateData.data,
          local: updateData.local,
          ...(updateData.montou_processo !== undefined && {
            montou_processo: updateData.montou_processo
          }),
          ...(updateData.numero_processo && updateData.numero_processo.trim() && {
            numero_processo: updateData.numero_processo.trim()
          })
        },
        updated_by: user.name,
        updated_at: processService.createTimestamp(),
      };

      // Adicionar notes apenas se houver conteúdo
      if (updateData.notes && updateData.notes.trim()) {
        historyData.notes = updateData.notes.trim();
      }

      // Registrar o andamento no histórico
      await processService.addToHistory(historyData);

      // Recarregar último andamento do processo específico
      try {
        const latestProgressFirebase = await processService.getLatestProgressUpdate(processId);
        if (latestProgressFirebase) {
          const latestProgress: ProcessHistoryType = {
            id: latestProgressFirebase.id,
            process_id: latestProgressFirebase.process_id,
            action: latestProgressFirebase.action as ProcessHistoryType['action'],
            old_values: latestProgressFirebase.old_values,
            new_values: latestProgressFirebase.new_values,
            updated_by: latestProgressFirebase.updated_by,
            updated_at: firebaseUtils.timestampToDate(latestProgressFirebase.updated_at).toISOString(),
            notes: latestProgressFirebase.notes,
          };

          // Atualizar o estado com o novo andamento
          setProcessesWithProgress(prev => 
            prev.map(item => 
              item.process.id === processId 
                ? { ...item, latestProgress }
                : item
            )
          );

          // Forçar recarregamento do processo específico para pegar numero_processo
          const updatedProcess = await processService.getProcessById(processId);
          if (updatedProcess) {
            const convertedProcess = convertFirebaseProcessToLocal(updatedProcess);
            console.log('Processo atualizado com numero_processo:', convertedProcess?.numero_processo);
            
            // Atualizar ambos os states
            setProcesses(prev => 
              prev.map(p => p.id === processId ? convertedProcess : p)
            );
            
            setProcessesWithProgress(prev => 
              prev.map(item => 
                item.process.id === processId 
                  ? { ...item, process: convertedProcess }
                  : item
              )
            );
          }
        }
      } catch (refreshErr) {
        console.error('Erro ao atualizar último andamento:', refreshErr);
      }

      toast({
        title: "Andamento registrado!",
        description: `Andamento salvo para ${formatDate(updateData.data)}.`,
      });

    } catch (err: any) {
      console.error('Erro ao registrar andamento:', err);
      toast({
        title: "Erro ao registrar andamento",
        description: err.message || "Não foi possível registrar o andamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusLabel = (status: Process['status']) => {
    const labels = {
      pendente: 'Pendente',
      em_andamento: 'Em Andamento',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };
    return labels[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleSaveProcess = async (processData: Omit<Process, 'id' | 'created_at' | 'updated_at' | 'updated_by'>) => {
    try {
      setLoading(true);

      if (selectedProcess) {
        // Atualizar processo existente
        const firebaseProcessData = {
          titulo: processData.titulo,
          descricao: processData.descricao,
          data: processData.data,
          local: processData.local,
          status: processData.status,
          prioridade: processData.prioridade,
          responsavel: processData.responsavel,
          updated_by: user.name,
        };

        await processService.updateProcess(selectedProcess.id, firebaseProcessData);

        toast({
        title: "Contrato atualizado!",
        description: "O contrato foi atualizado com sucesso.",
        });
      } else {
        // Criar novo contrato
        const firebaseProcessData = {
          titulo: processData.titulo,
          descricao: processData.descricao,
          data: processData.data,
          local: processData.local,
          status: processData.status,
          prioridade: processData.prioridade,
          responsavel: processData.responsavel,
          created_by: user.id, // Usar o ID real do usuário
          updated_by: user.name,
        };

        const processId = await processService.createProcess(firebaseProcessData);

        toast({
        title: "Contrato criado!",
        description: "O novo contrato foi criado com sucesso.",
        });

        console.log('Contrato criado com ID:', processId);
      }

      setIsFormOpen(false);
      setSelectedProcess(null);
    } catch (err: any) {
      console.error('Erro ao salvar processo:', err);
      toast({
        title: "Erro ao salvar contrato",
        description: err.message || "Não foi possível salvar o contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcess = async (processId: string) => {
    try {
      // Buscar informações do contrato para mostrar no modal
      const processToDelete = processes.find(p => p.id === processId);
      const processTitle = processToDelete?.titulo || 'contrato';
      
      const confirmed = await confirm({
        title: "Excluir Contrato",
        description: `Tem certeza que deseja excluir "${processTitle}"? Esta ação não pode ser desfeita.`,
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      });
      
      if (!confirmed) return;

      await processService.deleteProcess(processId);

      toast({
        title: "Contrato excluído",
        description: `"${processTitle}" foi excluído com sucesso.`,
      });

      // Recarregar dados após exclusão
      const updatedProcesses = await processService.getProcesses({
        where: [
          { field: 'created_by', operator: '==', value: user.id }
        ],
        orderBy: { field: 'updated_at', direction: 'desc' }
      });
      if (updatedProcesses.data.length >= 0) {
        const convertedProcesses = updatedProcesses.data.map(convertFirebaseProcessToLocal);
        setProcesses(convertedProcesses);
        
        // Recarregar progresso também
        const processesWithLatestProgress = await Promise.all(
          convertedProcesses.map(async (process) => {
            try {
              const latestProgressFirebase = await processService.getLatestProgressUpdate(process.id);
              let latestProgress: ProcessHistoryType | null = null;
              
              if (latestProgressFirebase) {
                latestProgress = {
                  id: latestProgressFirebase.id,
                  process_id: latestProgressFirebase.process_id,
                  action: latestProgressFirebase.action as ProcessHistoryType['action'],
                  old_values: latestProgressFirebase.old_values,
                  new_values: latestProgressFirebase.new_values,
                  updated_by: latestProgressFirebase.updated_by,
                  updated_at: firebaseUtils.timestampToDate(latestProgressFirebase.updated_at).toISOString(),
                  notes: latestProgressFirebase.notes,
                };
              }
              
              return { process, latestProgress };
            } catch (err) {
              return { process, latestProgress: null };
            }
          })
        );
        
        setProcessesWithProgress(processesWithLatestProgress);
      }
      
    } catch (err: any) {
      console.error('Erro ao excluir processo:', err);
      toast({
        title: "Erro ao excluir contrato",
        description: err.message || "Não foi possível excluir o contrato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (processId: string) => {
    try {
      setLoadingHistory(true);
      setSelectedProcessId(processId);
      setIsHistoryOpen(true);

      const firebaseHistory = await processService.getProcessHistory(processId);
      
      // Converter histórico do Firebase para formato local
      const localHistory: ProcessHistoryType[] = firebaseHistory.map((item: FirebaseProcessHistory) => ({
        id: item.id,
        process_id: item.process_id,
        action: item.action,
        old_values: item.old_values,
        new_values: item.new_values,
        updated_by: item.updated_by,
        updated_at: firebaseUtils.timestampToDate(item.updated_at).toISOString(),
        notes: item.notes,
      }));

      setHistory(localHistory);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico do contrato.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExport = () => {
    // Usar a função de exportação principal
    handleExportToExcel();
  };

  const getSelectedProcessTitle = () => {
    const process = processes.find(p => p.id === selectedProcessId);
    return process?.titulo || '';
  };

  // Mostrar loading enquanto carrega dados
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingSpinner text="Carregando contratos..." />
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Card className="p-8 text-center">
            <CardContent>
              <div className="text-destructive">
                <XCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">Erro ao carregar dados</p>
                <p>{error}</p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.location.reload()}
                >
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Contratos</h1>
            <p className="text-muted-foreground">Gerencie e acompanhe seus contratos</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCreateProcess} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendente}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <AlertCircle className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.em_andamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.concluido}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.cancelado}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <ProcessFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          localFilter={localFilter}
          setLocalFilter={setLocalFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          onExport={handleExport}
          processes={processes}
        />

        {/* Processes Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Contratos ({filteredProcesses.length})
            </h2>
          </div>

          {filteredProcesses.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent>
                <div className="text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg mb-2">Nenhum contrato encontrado</p>
                  <p>Tente ajustar os filtros ou criar um novo contrato</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProcessesWithProgress.map(({ process, latestProgress }) => (
                <ProcessCard
                  key={process.id}
                  process={process}
                  latestProgress={latestProgress}
                  onEdit={handleEditProcess}
                  onDelete={handleDeleteProcess}
                  onViewHistory={handleViewHistory}
                  onQuickStatusUpdate={handleQuickStatusUpdate}
                  onCompleteProcess={handleCompleteProcess}
                  currentUser={user}
                />
              ))}
            </div>
          )}
        </div>

        {/* Process Form Modal */}
        <ProcessForm
          process={selectedProcess}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveProcess}
          currentUser={user}
        />

        {/* Process History Modal */}
        <ProcessHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={history.filter(h => h.process_id === selectedProcessId)}
          processTitle={getSelectedProcessTitle()}
          loading={loadingHistory}
        />

        {/* Quick Status Update Modal */}
        <QuickStatusUpdate
          process={quickUpdateProcess}
          isOpen={isQuickStatusOpen}
          onClose={() => {
            setIsQuickStatusOpen(false);
            setQuickUpdateProcess(null);
          }}
          onUpdateProcess={handleQuickUpdateSubmit}
          isUpdating={updatingStatus}
        />

        {/* Process Completion Modal */}
        <ProcessCompletionModal
          process={completionProcess}
          isOpen={isCompletionModalOpen}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setCompletionProcess(null);
          }}
          onConfirm={handleConfirmCompletion}
          isCompleting={completingProcess}
        />

        {/* Modal de Confirmação */}
        {confirmDialog}
      </div>
    </div>
  );
}