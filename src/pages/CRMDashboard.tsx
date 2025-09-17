import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Mail,
  Star,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit
} from 'lucide-react';
import { EmpresaForm } from '@/components/crm/EmpresaForm';
import { ContatoForm } from '@/components/crm/ContatoForm';
import { LogInformacaoForm } from '@/components/crm/LogInformacaoForm';
import { DeleteEmpresaModal } from '@/components/crm/DeleteEmpresaModal';
import { 
  Empresa, 
  Contato, 
  LogInformacao, 
  EmpresaFormData, 
  ContatoFormData, 
  LogInformacaoFormData,
  CRMStats,
  RelevanciaInfo
} from '@/types/crm';
import { empresaService, contatoService, logInformacaoService, crmStatsService } from '@/lib/crm-services';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/process';

interface CRMDashboardProps {
  user: User;
}

const relevanciaConfig = {
  baixa: { label: 'Baixa', color: 'bg-blue-100 text-blue-800', icon: Info },
  media: { label: 'Média', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export function CRMDashboard({ user }: CRMDashboardProps) {
  // Estados principais
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [logs, setLogs] = useState<LogInformacao[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('empresas');
  const [isEmpresaFormOpen, setIsEmpresaFormOpen] = useState(false);
  const [isContatoFormOpen, setIsContatoFormOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogInformacao | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [relevanciaFilter, setRelevanciaFilter] = useState<RelevanciaInfo | 'all'>('all');

  const { toast } = useToast();

  const loadCRMData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar empresas
      const empresasResult = await empresaService.getEmpresas({
        where: [{ field: 'created_by', operator: '==', value: user.id }],
        orderBy: { field: 'updated_at', direction: 'desc' }
      });
      setEmpresas(empresasResult.data);

      // Carregar contatos
      const contatosResult = await contatoService.searchContatos({}, user.id);
      setContatos(contatosResult);

      // Carregar logs
      const logsResult = await logInformacaoService.searchLogs({}, user.id);
      setLogs(logsResult);

      // Carregar estatísticas
      const statsResult = await crmStatsService.getCRMStats(user.id);
      setStats(statsResult);

    } catch (err: unknown) {
      console.error('Erro ao carregar dados do CRM:', err);
      setError('Erro ao carregar dados do CRM');
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do CRM. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  // Carregar dados iniciais
  useEffect(() => {
    loadCRMData();
  }, [loadCRMData]);

  // Filtrar dados
  const filteredEmpresas = useMemo(() => {
    if (!searchTerm) return empresas;
    return empresas.filter(empresa =>
      empresa.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.cnpj.includes(searchTerm)
    );
  }, [empresas, searchTerm]);

  const filteredContatos = useMemo(() => {
    if (!searchTerm) return contatos;
    return contatos.filter(contato =>
      contato.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contato.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contato.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contatos, searchTerm]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (relevanciaFilter !== 'all') {
      filtered = filtered.filter(log => log.relevancia === relevanciaFilter);
    }

    return filtered;
  }, [logs, searchTerm, relevanciaFilter]);

  // Handlers para empresas
  const handleCreateEmpresa = () => {
    setSelectedEmpresa(null);
    setIsEmpresaFormOpen(true);
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsEmpresaFormOpen(true);
  };

  const handleSaveEmpresa = async (empresaData: EmpresaFormData) => {
    try {
      setIsLoading(true);
      
      if (selectedEmpresa) {
        await empresaService.updateEmpresa(selectedEmpresa.id, empresaData, user.id);
      } else {
        await empresaService.createEmpresa(empresaData, user.id);
      }
      
      await loadCRMData();
      setIsEmpresaFormOpen(false);
      setSelectedEmpresa(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para contatos
  const handleCreateContato = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSelectedContato(null);
    setIsContatoFormOpen(true);
  };

  const handleEditContato = (contato: Contato, empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSelectedContato(contato);
    setIsContatoFormOpen(true);
  };

  const handleSaveContato = async (contatoData: ContatoFormData) => {
    try {
      setIsLoading(true);
      
      if (selectedContato) {
        await contatoService.updateContato(selectedContato.id, contatoData, user.id);
      } else {
        await contatoService.createContato(contatoData, user.id);
      }
      
      await loadCRMData();
      setIsContatoFormOpen(false);
      setSelectedContato(null);
      setSelectedEmpresa(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para logs
  const handleCreateLog = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSelectedLog(null);
    setIsLogFormOpen(true);
  };

  const handleEditLog = (log: LogInformacao, empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSelectedLog(log);
    setIsLogFormOpen(true);
  };

  const handleSaveLog = async (logData: LogInformacaoFormData) => {
    try {
      setIsLoading(true);
      
      if (selectedLog) {
        await logInformacaoService.updateLog(selectedLog.id, logData, user.id);
      } else {
        await logInformacaoService.createLog(logData, user.id);
      }
      
      await loadCRMData();
      setIsLogFormOpen(false);
      setSelectedLog(null);
      setSelectedEmpresa(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para exclusão
  const handleDeleteEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (password: string) => {
    if (!selectedEmpresa) return;
    
    try {
      setIsLoading(true);
      await empresaService.deleteEmpresa(selectedEmpresa.id, user.id, user.email);
      
      toast({
        title: "Empresa excluída!",
        description: `A empresa "${selectedEmpresa.nome_fantasia}" foi excluída com sucesso.`,
      });
      
      await loadCRMData();
      setIsDeleteModalOpen(false);
      setSelectedEmpresa(null);
    } catch (error: unknown) {
      console.error('Erro ao excluir empresa:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível excluir a empresa. Tente novamente.";
      toast({
        title: "Erro ao excluir empresa",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar contatos de uma empresa
  const getContatosByEmpresa = (empresaId: string) => {
    return contatos.filter(contato => contato.empresa_id === empresaId);
  };

  // Buscar logs de uma empresa
  const getLogsByEmpresa = (empresaId: string) => {
    return logs.filter(log => log.empresa_id === empresaId);
  };

  // Buscar empresa por ID
  const getEmpresaById = (empresaId: string) => {
    return empresas.find(empresa => empresa.id === empresaId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingSpinner text="Carregando dados do CRM..." />
        </div>
      </div>
    );
  }

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
                <Button className="mt-4" onClick={loadCRMData}>
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
            <h1 className="text-3xl font-bold">CRM - Gestão de Contatos</h1>
            <p className="text-muted-foreground">Gerencie empresas, contatos e informações</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCreateEmpresa} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empresas</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_empresas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contatos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_contatos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Logs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_logs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contatos Principais</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contatos_principais}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar empresas, contatos ou logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={relevanciaFilter}
                  onChange={(e) => setRelevanciaFilter(e.target.value as RelevanciaInfo | 'all')}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="all">Todas as relevâncias</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="empresas">Empresas ({filteredEmpresas.length})</TabsTrigger>
            <TabsTrigger value="contatos">Contatos ({filteredContatos.length})</TabsTrigger>
            <TabsTrigger value="logs">Logs ({filteredLogs.length})</TabsTrigger>
          </TabsList>

          {/* Tab Empresas */}
          <TabsContent value="empresas" className="space-y-4">
            {filteredEmpresas.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <div className="text-muted-foreground">
                    <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg mb-2">Nenhuma empresa encontrada</p>
                    <p>Tente ajustar os filtros ou criar uma nova empresa</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEmpresas.map(empresa => {
                  const empresaContatos = getContatosByEmpresa(empresa.id);
                  const empresaLogs = getLogsByEmpresa(empresa.id);
                  
                  return (
                    <Card key={empresa.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{empresa.nome_fantasia}</CardTitle>
                            <CardDescription>{empresa.razao_social}</CardDescription>
                          </div>
                          <Badge variant="outline">{empresa.cnpj}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{empresa.endereco.cidade}, {empresa.endereco.estado}</span>
                          </div>
                          {empresa.telefone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{empresa.telefone}</span>
                            </div>
                          )}
                          {empresa.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{empresa.email}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>{empresaContatos.length} contatos</span>
                          <span>{empresaLogs.length} logs</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateContato(empresa)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Contato
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateLog(empresa)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Log
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEmpresa(empresa)}
                            className="text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteEmpresa(empresa)}
                            className="text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab Contatos */}
          <TabsContent value="contatos" className="space-y-4">
            {filteredContatos.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <div className="text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg mb-2">Nenhum contato encontrado</p>
                    <p>Tente ajustar os filtros ou criar um novo contato</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContatos.map(contato => {
                  const empresa = getEmpresaById(contato.empresa_id);
                  
                  return (
                    <Card key={contato.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {contato.nome}
                              {contato.is_principal && <Star className="h-4 w-4 text-yellow-500" />}
                            </CardTitle>
                            <CardDescription>{contato.cargo}</CardDescription>
                          </div>
                          {contato.departamento && (
                            <Badge variant="outline">{contato.departamento}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{empresa?.nome_fantasia || 'Empresa não encontrada'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{contato.email}</span>
                          </div>
                          {contato.telefone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{contato.telefone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {empresa && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditContato(contato, empresa)}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab Logs */}
          <TabsContent value="logs" className="space-y-4">
            {filteredLogs.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <div className="text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg mb-2">Nenhum log encontrado</p>
                    <p>Tente ajustar os filtros ou criar um novo log</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map(log => {
                  const empresa = getEmpresaById(log.empresa_id);
                  const contato = log.contato_id ? contatos.find(c => c.id === log.contato_id) : null;
                  const relevancia = relevanciaConfig[log.relevancia];
                  const RelevanciaIcon = relevancia.icon;
                  
                  return (
                    <Card key={log.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{log.titulo}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {empresa?.nome_fantasia || 'Empresa não encontrada'}
                              {contato && (
                                <>
                                  <span>•</span>
                                  <Users className="h-4 w-4" />
                                  {contato.nome}
                                </>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge className={relevancia.color}>
                              <RelevanciaIcon className="h-3 w-3 mr-1" />
                              {relevancia.label}
                            </Badge>
                            <Badge variant="outline">{log.categoria}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{log.descricao}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.data_ocorrencia).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {new Date(log.data_registro).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <EmpresaForm
          empresa={selectedEmpresa}
          isOpen={isEmpresaFormOpen}
          onClose={() => {
            setIsEmpresaFormOpen(false);
            setSelectedEmpresa(null);
          }}
          onSave={handleSaveEmpresa}
          isLoading={isLoading}
        />

        {selectedEmpresa && (
          <ContatoForm
            contato={selectedContato}
            empresa={selectedEmpresa}
            isOpen={isContatoFormOpen}
            onClose={() => {
              setIsContatoFormOpen(false);
              setSelectedContato(null);
              setSelectedEmpresa(null);
            }}
            onSave={handleSaveContato}
            isLoading={isLoading}
          />
        )}

        {selectedEmpresa && (
          <LogInformacaoForm
            log={selectedLog}
            empresa={selectedEmpresa}
            contatos={getContatosByEmpresa(selectedEmpresa.id)}
            isOpen={isLogFormOpen}
            onClose={() => {
              setIsLogFormOpen(false);
              setSelectedLog(null);
              setSelectedEmpresa(null);
            }}
            onSave={handleSaveLog}
            isLoading={isLoading}
          />
        )}

        {selectedEmpresa && (
          <DeleteEmpresaModal
            empresa={selectedEmpresa}
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedEmpresa(null);
            }}
            onConfirm={handleConfirmDelete}
            isLoading={isLoading}
            contatosCount={getContatosByEmpresa(selectedEmpresa.id).length}
            logsCount={logs.filter(log => log.empresa_id === selectedEmpresa.id).length}
          />
        )}
      </div>
    </div>
  );
}
