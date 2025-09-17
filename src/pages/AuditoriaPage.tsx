import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Search, 
  Calendar, 
  User, 
  Building2, 
  Trash2, 
  FileText, 
  Users,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react';
import { auditoriaService } from '@/lib/crm-services';
import { useToast } from '@/hooks/use-toast';
import { User as UserType } from '@/types/process';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditoriaPageProps {
  user: UserType;
}

interface ExclusaoEmpresa {
  id: string;
  tipo: string;
  empresa_id: string;
  empresa_nome: string;
  empresa_cnpj: string;
  contatos_excluidos: number;
  logs_excluidos: number;
  usuario_id: string;
  usuario_email: string;
  data_exclusao: string;
  detalhes: {
    razao_social: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      estado: string;
    };
    telefone?: string;
    email?: string;
    site?: string;
    observacoes?: string;
  };
}

export function AuditoriaPage({ user }: AuditoriaPageProps) {
  const [exclusoes, setExclusoes] = useState<ExclusaoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExclusao, setSelectedExclusao] = useState<ExclusaoEmpresa | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const loadExclusoes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await auditoriaService.getExclusoesEmpresas(user.id);
      setExclusoes(data);
    } catch (error: unknown) {
      console.error('Erro ao carregar exclusões:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível carregar os registros de auditoria.";
      toast({
        title: "Erro ao carregar auditoria",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    loadExclusoes();
  }, [loadExclusoes]);

  const filteredExclusoes = exclusoes.filter(exclusao =>
    exclusao.empresa_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exclusao.empresa_cnpj.includes(searchTerm) ||
    exclusao.empresa_id.includes(searchTerm)
  );

  const handleViewDetails = (exclusao: ExclusaoEmpresa) => {
    setSelectedExclusao(exclusao);
    setShowDetails(true);
  };

  const handleExportAuditoria = () => {
    try {
      const data = filteredExclusoes.map(exclusao => ({
        'Data da Exclusão': format(new Date(exclusao.data_exclusao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Empresa': exclusao.empresa_nome,
        'Razão Social': exclusao.detalhes.razao_social,
        'CNPJ': exclusao.empresa_cnpj,
        'Endereço': `${exclusao.detalhes.endereco.logradouro}, ${exclusao.detalhes.endereco.numero} - ${exclusao.detalhes.endereco.bairro}, ${exclusao.detalhes.endereco.cidade}/${exclusao.detalhes.endereco.estado}`,
        'CEP': exclusao.detalhes.endereco.cep,
        'Telefone': exclusao.detalhes.telefone || 'N/A',
        'Email': exclusao.detalhes.email || 'N/A',
        'Site': exclusao.detalhes.site || 'N/A',
        'Contatos Excluídos': exclusao.contatos_excluidos,
        'Logs Excluídos': exclusao.logs_excluidos,
        'Usuário': exclusao.usuario_email,
        'Observações': exclusao.detalhes.observacoes || 'N/A'
      }));

      const csvContent = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `auditoria_exclusoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Auditoria exportada!",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao exportar auditoria:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados de auditoria.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoria de Exclusões</h1>
          <p className="text-muted-foreground">
            Registros de empresas excluídas e dados relacionados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportAuditoria}
            disabled={exclusoes.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou ID da empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Exclusões</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exclusoes.length}</div>
            <p className="text-xs text-muted-foreground">
              Empresas excluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatos Excluídos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exclusoes.reduce((acc, excl) => acc + excl.contatos_excluidos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de contatos removidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs Excluídos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exclusoes.reduce((acc, excl) => acc + excl.logs_excluidos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de logs removidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Exclusão</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exclusoes.length > 0 ? format(new Date(exclusoes[0].data_exclusao), 'dd/MM', { locale: ptBR }) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {exclusoes.length > 0 ? format(new Date(exclusoes[0].data_exclusao), 'yyyy', { locale: ptBR }) : 'Nenhuma exclusão'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Exclusões */}
      <div className="space-y-4">
        {filteredExclusoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma exclusão encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm ? 'Nenhuma exclusão corresponde aos filtros aplicados.' : 'Ainda não há registros de exclusão de empresas.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExclusoes.map((exclusao) => (
              <Card key={exclusao.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {exclusao.empresa_nome}
                      </CardTitle>
                      <CardDescription>{exclusao.detalhes.razao_social}</CardDescription>
                    </div>
                    <Badge variant="destructive">Excluída</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{exclusao.empresa_cnpj}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(exclusao.data_exclusao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{exclusao.detalhes.endereco.cidade}, {exclusao.detalhes.endereco.estado}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>{exclusao.contatos_excluidos} contatos</span>
                    <span>{exclusao.logs_excluidos} logs</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(exclusao)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedExclusao && showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Detalhes da Exclusão</CardTitle>
                  <CardDescription>
                    Dados completos da empresa excluída
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nome Fantasia:</span>
                    <p className="text-muted-foreground">{selectedExclusao.empresa_nome}</p>
                  </div>
                  <div>
                    <span className="font-medium">Razão Social:</span>
                    <p className="text-muted-foreground">{selectedExclusao.detalhes.razao_social}</p>
                  </div>
                  <div>
                    <span className="font-medium">CNPJ:</span>
                    <p className="text-muted-foreground">{selectedExclusao.empresa_cnpj}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data da Exclusão:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedExclusao.data_exclusao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Endereço</h3>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">CEP:</span> {selectedExclusao.detalhes.endereco.cep}</p>
                  <p><span className="font-medium">Logradouro:</span> {selectedExclusao.detalhes.endereco.logradouro}, {selectedExclusao.detalhes.endereco.numero}</p>
                  {selectedExclusao.detalhes.endereco.complemento && (
                    <p><span className="font-medium">Complemento:</span> {selectedExclusao.detalhes.endereco.complemento}</p>
                  )}
                  <p><span className="font-medium">Bairro:</span> {selectedExclusao.detalhes.endereco.bairro}</p>
                  <p><span className="font-medium">Cidade/Estado:</span> {selectedExclusao.detalhes.endereco.cidade}/{selectedExclusao.detalhes.endereco.estado}</p>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Contato</h3>
                <div className="text-sm space-y-1">
                  {selectedExclusao.detalhes.telefone && (
                    <p><span className="font-medium">Telefone:</span> {selectedExclusao.detalhes.telefone}</p>
                  )}
                  {selectedExclusao.detalhes.email && (
                    <p><span className="font-medium">Email:</span> {selectedExclusao.detalhes.email}</p>
                  )}
                  {selectedExclusao.detalhes.site && (
                    <p><span className="font-medium">Site:</span> {selectedExclusao.detalhes.site}</p>
                  )}
                </div>
              </div>

              {/* Observações */}
              {selectedExclusao.detalhes.observacoes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Observações</h3>
                  <p className="text-sm text-muted-foreground">{selectedExclusao.detalhes.observacoes}</p>
                </div>
              )}

              {/* Impacto da Exclusão */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Impacto da Exclusão</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span><span className="font-medium">Contatos:</span> {selectedExclusao.contatos_excluidos} excluídos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span><span className="font-medium">Logs:</span> {selectedExclusao.logs_excluidos} excluídos</span>
                  </div>
                </div>
              </div>

              {/* Usuário Responsável */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Usuário Responsável</h3>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedExclusao.usuario_email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
