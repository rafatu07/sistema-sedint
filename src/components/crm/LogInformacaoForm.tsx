import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  User,
  Star
} from 'lucide-react';
import { LogInformacao, LogInformacaoFormData, Empresa, Contato, RelevanciaInfo } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogInformacaoFormProps {
  log?: LogInformacao | null;
  empresa: Empresa;
  contatos: Contato[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (logData: LogInformacaoFormData) => Promise<void>;
  isLoading?: boolean;
}

const categorias = [
  'Comercial',
  'Financeiro',
  'Jurídico',
  'Marketing',
  'Operacional',
  'Recursos Humanos',
  'Tecnologia',
  'Vendas',
  'Reunião',
  'Proposta',
  'Contrato',
  'Problema',
  'Solução',
  'Outros'
];

const relevanciaConfig = {
  baixa: {
    label: 'Baixa',
    icon: Info,
    color: 'bg-blue-100 text-blue-800',
    description: 'Informação de baixa prioridade'
  },
  media: {
    label: 'Média',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Informação importante'
  },
  alta: {
    label: 'Alta',
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-800',
    description: 'Informação muito importante'
  },
  critica: {
    label: 'Crítica',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    description: 'Informação crítica - ação imediata necessária'
  }
};

export function LogInformacaoForm({ 
  log, 
  empresa, 
  contatos, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading = false 
}: LogInformacaoFormProps) {
  const [formData, setFormData] = useState<LogInformacaoFormData>({
    empresa_id: empresa.id,
    contato_id: '',
    titulo: '',
    descricao: '',
    relevancia: 'media',
    categoria: '',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    anexos: []
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  // Preencher formulário quando editar
  useEffect(() => {
    if (log) {
      setFormData({
        empresa_id: log.empresa_id,
        contato_id: log.contato_id || '',
        titulo: log.titulo,
        descricao: log.descricao,
        relevancia: log.relevancia,
        categoria: log.categoria,
        data_ocorrencia: log.data_ocorrencia.split('T')[0],
        anexos: log.anexos || []
      });
      setSelectedDate(new Date(log.data_ocorrencia));
    } else {
      // Resetar formulário para novo log
      setFormData({
        empresa_id: empresa.id,
        contato_id: '',
        titulo: '',
        descricao: '',
        relevancia: 'media',
        categoria: '',
        data_ocorrencia: new Date().toISOString().split('T')[0],
        anexos: []
      });
      setSelectedDate(new Date());
    }
    setErrors({});
  }, [log, empresa.id, isOpen]);

  const handleInputChange = (field: keyof LogInformacaoFormData, value: string | string[]) => {
    // Tratar valor "none" como vazio para contato_id
    const processedValue = field === 'contato_id' && value === 'none' ? '' : value;
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateString = date.toISOString().split('T')[0];
      handleInputChange('data_ocorrencia', dateString);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.categoria.trim()) {
      newErrors.categoria = 'Categoria é obrigatória';
    }

    if (!formData.data_ocorrencia) {
      newErrors.data_ocorrencia = 'Data de ocorrência é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSave(formData);
      toast({
        title: log ? "Log atualizado!" : "Log criado!",
        description: log ? "O log de informação foi atualizado com sucesso." : "O novo log foi criado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o log. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const RelevanciaIcon = relevanciaConfig[formData.relevancia].icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {log ? 'Editar Log de Informação' : 'Novo Log de Informação'}
          </DialogTitle>
          <DialogDescription>
            {log ? 'Atualize as informações do log' : `Registre uma nova informação para ${empresa.nome_fantasia}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange('titulo', e.target.value)}
                  placeholder="Resumo da informação"
                  className={errors.titulo ? 'border-destructive' : ''}
                />
                {errors.titulo && <p className="text-sm text-destructive">{errors.titulo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descreva detalhadamente a informação..."
                  rows={4}
                  className={errors.descricao ? 'border-destructive' : ''}
                />
                {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Categorização e Relevância */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Categorização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => handleInputChange('categoria', value)}
                  >
                    <SelectTrigger className={errors.categoria ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(categoria => (
                        <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relevancia">Relevância</Label>
                  <Select
                    value={formData.relevancia}
                    onValueChange={(value) => handleInputChange('relevancia', value as RelevanciaInfo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(relevanciaConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview da relevância selecionada */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <RelevanciaIcon className="h-4 w-4" />
                <Badge className={relevanciaConfig[formData.relevancia].color}>
                  {relevanciaConfig[formData.relevancia].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {relevanciaConfig[formData.relevancia].description}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Data e Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Data e Contexto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Ocorrência *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.data_ocorrencia ? 'border-destructive' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.data_ocorrencia && <p className="text-sm text-destructive">{errors.data_ocorrencia}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contato_id">Contato Relacionado</Label>
                  <Select
                    value={formData.contato_id || 'none'}
                    onValueChange={(value) => handleInputChange('contato_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o contato (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum contato específico</SelectItem>
                      {contatos.map(contato => (
                        <SelectItem key={contato.id} value={contato.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {contato.nome}
                            {contato.is_principal && <Star className="h-3 w-3 text-yellow-500" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{empresa.nome_fantasia}</p>
                    <p className="text-sm text-muted-foreground">{empresa.razao_social}</p>
                    <p className="text-xs text-muted-foreground">CNPJ: {empresa.cnpj}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (log ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
