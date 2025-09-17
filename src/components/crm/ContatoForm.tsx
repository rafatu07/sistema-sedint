import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { User, Phone, Mail, Building2, Star } from 'lucide-react';
import { Contato, ContatoFormData, Empresa } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface ContatoFormProps {
  contato?: Contato | null;
  empresa: Empresa;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contatoData: ContatoFormData) => Promise<void>;
  isLoading?: boolean;
}

const departamentos = [
  'Administrativo',
  'Comercial',
  'Financeiro',
  'Jurídico',
  'Marketing',
  'Operacional',
  'Recursos Humanos',
  'Tecnologia',
  'Vendas',
  'Outros'
];

export function ContatoForm({ contato, empresa, isOpen, onClose, onSave, isLoading = false }: ContatoFormProps) {
  const [formData, setFormData] = useState<ContatoFormData>({
    empresa_id: empresa.id,
    nome: '',
    cargo: '',
    telefone: '',
    celular: '',
    email: '',
    departamento: '',
    observacoes: '',
    is_principal: false
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  // Preencher formulário quando editar
  useEffect(() => {
    if (contato) {
      setFormData({
        empresa_id: contato.empresa_id,
        nome: contato.nome,
        cargo: contato.cargo || '',
        telefone: contato.telefone || '',
        celular: contato.celular || '',
        email: contato.email,
        departamento: contato.departamento || '',
        observacoes: contato.observacoes || '',
        is_principal: contato.is_principal
      });
    } else {
      // Resetar formulário para novo contato
      setFormData({
        empresa_id: empresa.id,
        nome: '',
        cargo: '',
        telefone: '',
        celular: '',
        email: '',
        departamento: '',
        observacoes: '',
        is_principal: false
      });
    }
    setErrors({});
  }, [contato, empresa.id, isOpen]);

  // Formatar telefone
  const formatPhone = (value: string): string => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
  };

  const handleInputChange = (field: keyof ContatoFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.telefone && formData.telefone.replace(/[^\d]/g, '').length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
    }

    if (formData.celular && formData.celular.replace(/[^\d]/g, '').length < 11) {
      newErrors.celular = 'Celular deve ter pelo menos 11 dígitos';
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
        title: contato ? "Contato atualizado!" : "Contato criado!",
        description: contato ? "O contato foi atualizado com sucesso." : "O novo contato foi criado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o contato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {contato ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
          <DialogDescription>
            {contato ? 'Atualize as informações do contato' : `Adicione um novo contato para ${empresa.nome_fantasia}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="João Silva"
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => handleInputChange('cargo', e.target.value)}
                    placeholder="Gerente de Vendas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Select
                    value={formData.departamento}
                    onValueChange={(value) => handleInputChange('departamento', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_principal"
                  checked={formData.is_principal}
                  onCheckedChange={(checked) => handleInputChange('is_principal', checked as boolean)}
                />
                <Label htmlFor="is_principal" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Contato Principal
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="joao@empresa.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                    placeholder="(11) 1234-5678"
                    className={errors.telefone ? 'border-destructive' : ''}
                  />
                  {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => handleInputChange('celular', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className={errors.celular ? 'border-destructive' : ''}
                  />
                  {errors.celular && <p className="text-sm text-destructive">{errors.celular}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
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
                  placeholder="Informações adicionais sobre o contato..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (contato ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
