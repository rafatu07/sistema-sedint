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
import { Separator } from '@/components/ui/separator';
import { Building2, MapPin, Phone, Mail, Globe, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Empresa, EmpresaFormData } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface EmpresaFormProps {
  empresa?: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (empresaData: EmpresaFormData) => Promise<void>;
  isLoading?: boolean;
}

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function EmpresaForm({ empresa, isOpen, onClose, onSave, isLoading = false }: EmpresaFormProps) {
  const [formData, setFormData] = useState<EmpresaFormData>({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    telefone: '',
    email: '',
    site: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const [cnpjValido, setCnpjValido] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Preencher formulário quando editar
  useEffect(() => {
    if (empresa) {
      setFormData({
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        endereco: { ...empresa.endereco },
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        site: empresa.site || '',
        observacoes: empresa.observacoes || ''
      });
    } else {
      // Resetar formulário para novo cadastro
      setFormData({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        endereco: {
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        },
        telefone: '',
        email: '',
        site: '',
        observacoes: ''
      });
    }
    setErrors({});
  }, [empresa, isOpen]);

  // Validação do CNPJ
  const validateCNPJ = (cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    if (cleanCNPJ.length !== 14) return false;

    // Validação básica de CNPJ
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights1[i];
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights2[i];
    }
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return digit1 === parseInt(cleanCNPJ[12]) && digit2 === parseInt(cleanCNPJ[13]);
  };

  // Formatar CNPJ com limite de caracteres
  const formatCNPJ = (value: string): string => {
    const cleanValue = value.replace(/[^\d]/g, '').slice(0, 14); // Limita a 14 dígitos
    if (cleanValue.length <= 2) return cleanValue;
    if (cleanValue.length <= 5) return cleanValue.replace(/^(\d{2})(\d{0,3})$/, '$1.$2');
    if (cleanValue.length <= 8) return cleanValue.replace(/^(\d{2})(\d{3})(\d{0,3})$/, '$1.$2.$3');
    if (cleanValue.length <= 12) return cleanValue.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, '$1.$2.$3/$4');
    return cleanValue.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, '$1.$2.$3/$4-$5');
  };

  // Buscar endereço pelo CEP
  const buscarEnderecoPorCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/[^\d]/g, '');
    if (cleanCEP.length !== 8) return;

    setBuscandoCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado. Verifique e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Preencher campos de endereço automaticamente
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          cep: formatCEP(cleanCEP)
        }
      }));

      toast({
        title: "Endereço encontrado!",
        description: "Os dados de endereço foram preenchidos automaticamente.",
      });

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBuscandoCEP(false);
    }
  };

  // Formatar CEP
  const formatCEP = (value: string): string => {
    const cleanValue = value.replace(/[^\d]/g, '');
    return cleanValue.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  // Formatar telefone
  const formatPhone = (value: string): string => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      if (field.startsWith('endereco.')) {
        const enderecoField = field.split('.')[1];
        return {
          ...prev,
          endereco: {
            ...prev.endereco,
            [enderecoField]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Buscar endereço automaticamente quando CEP for preenchido
    if (field === 'endereco.cep') {
      const cleanCEP = value.replace(/[^\d]/g, '');
      if (cleanCEP.length === 8) {
        buscarEnderecoPorCEP(value);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.cnpj) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!formData.razao_social.trim()) {
      newErrors.razao_social = 'Razão Social é obrigatória';
    }

    if (!formData.nome_fantasia.trim()) {
      newErrors.nome_fantasia = 'Nome Fantasia é obrigatório';
    }

    if (!formData.endereco.logradouro.trim()) {
      newErrors['endereco.logradouro'] = 'Logradouro é obrigatório';
    }

    if (!formData.endereco.numero.trim()) {
      newErrors['endereco.numero'] = 'Número é obrigatório';
    }

    if (!formData.endereco.bairro.trim()) {
      newErrors['endereco.bairro'] = 'Bairro é obrigatório';
    }

    if (!formData.endereco.cidade.trim()) {
      newErrors['endereco.cidade'] = 'Cidade é obrigatória';
    }

    if (!formData.endereco.estado) {
      newErrors['endereco.estado'] = 'Estado é obrigatório';
    }

    if (!formData.endereco.cep.trim()) {
      newErrors['endereco.cep'] = 'CEP é obrigatório';
    } else if (formData.endereco.cep.replace(/[^\d]/g, '').length !== 8) {
      newErrors['endereco.cep'] = 'CEP deve ter 8 dígitos';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
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
        title: empresa ? "Empresa atualizada!" : "Empresa criada!",
        description: empresa ? "A empresa foi atualizada com sucesso." : "A nova empresa foi criada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {empresa ? 'Editar Empresa' : 'Nova Empresa'}
          </DialogTitle>
          <DialogDescription>
            {empresa ? 'Atualize as informações da empresa' : 'Preencha os dados da nova empresa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => {
                      // Aceitar apenas números e limitar a 14 dígitos
                      const cleanValue = e.target.value.replace(/[^\d]/g, '').slice(0, 14);
                      const formattedValue = formatCNPJ(cleanValue);
                      handleInputChange('cnpj', formattedValue);
                      
                      // Validar CNPJ em tempo real quando tiver 14 dígitos
                      if (cleanValue.length === 14) {
                        const valido = validateCNPJ(formattedValue);
                        setCnpjValido(valido);
                        if (!valido) {
                          setErrors(prev => ({ ...prev, cnpj: 'CNPJ inválido' }));
                        } else {
                          setErrors(prev => ({ ...prev, cnpj: '' }));
                        }
                      } else {
                        setCnpjValido(null);
                        setErrors(prev => ({ ...prev, cnpj: '' }));
                      }
                    }}
                    placeholder="00.000.000/0000-00"
                    className={errors.cnpj ? 'border-destructive' : ''}
                    maxLength={18} // 14 dígitos + 4 caracteres de formatação
                  />
                  {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
                  {cnpjValido === true && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      CNPJ válido
                    </p>
                  )}
                  {cnpjValido === false && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      CNPJ inválido
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => handleInputChange('razao_social', e.target.value)}
                    placeholder="Nome da empresa"
                    className={errors.razao_social ? 'border-destructive' : ''}
                  />
                  {errors.razao_social && <p className="text-sm text-destructive">{errors.razao_social}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                  placeholder="Nome comercial da empresa"
                  className={errors.nome_fantasia ? 'border-destructive' : ''}
                />
                {errors.nome_fantasia && <p className="text-sm text-destructive">{errors.nome_fantasia}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CEP primeiro */}
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.endereco.cep}
                    onChange={(e) => handleInputChange('endereco.cep', formatCEP(e.target.value))}
                    placeholder="00000-000"
                    className={errors['endereco.cep'] ? 'border-destructive' : ''}
                    maxLength={9}
                  />
                  {buscandoCEP && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                {errors['endereco.cep'] && <p className="text-sm text-destructive">{errors['endereco.cep']}</p>}
                <p className="text-xs text-muted-foreground">
                  Digite o CEP para preenchimento automático do endereço
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro *</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco.logradouro}
                    onChange={(e) => handleInputChange('endereco.logradouro', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                    className={errors['endereco.logradouro'] ? 'border-destructive' : ''}
                  />
                  {errors['endereco.logradouro'] && <p className="text-sm text-destructive">{errors['endereco.logradouro']}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    value={formData.endereco.numero}
                    onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
                    placeholder="123"
                    className={errors['endereco.numero'] ? 'border-destructive' : ''}
                  />
                  {errors['endereco.numero'] && <p className="text-sm text-destructive">{errors['endereco.numero']}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.endereco.complemento}
                  onChange={(e) => handleInputChange('endereco.complemento', e.target.value)}
                  placeholder="Sala, Andar, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco.bairro}
                    onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
                    placeholder="Centro"
                    className={errors['endereco.bairro'] ? 'border-destructive' : ''}
                  />
                  {errors['endereco.bairro'] && <p className="text-sm text-destructive">{errors['endereco.bairro']}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.endereco.cidade}
                    onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                    placeholder="São Paulo"
                    className={errors['endereco.cidade'] ? 'border-destructive' : ''}
                  />
                  {errors['endereco.cidade'] && <p className="text-sm text-destructive">{errors['endereco.cidade']}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.endereco.estado}
                    onValueChange={(value) => handleInputChange('endereco.estado', value)}
                  >
                    <SelectTrigger className={errors['endereco.estado'] ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasil.map(estado => (
                        <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors['endereco.estado'] && <p className="text-sm text-destructive">{errors['endereco.estado']}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                    placeholder="(11) 1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  value={formData.site}
                  onChange={(e) => handleInputChange('site', e.target.value)}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre a empresa..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (empresa ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
