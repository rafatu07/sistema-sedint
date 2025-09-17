import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  Trash2, 
  Eye, 
  EyeOff,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import { Empresa } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface DeleteEmpresaModalProps {
  empresa: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isLoading?: boolean;
  contatosCount: number;
  logsCount: number;
}

export function DeleteEmpresaModal({ 
  empresa, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false,
  contatosCount,
  logsCount
}: DeleteEmpresaModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { toast } = useToast();

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setValidationError('');
  };

  const handleConfirm = async () => {
    if (!password.trim()) {
      setValidationError('Senha é obrigatória');
      return;
    }

    if (!empresa) return;

    try {
      setIsValidating(true);
      setValidationError('');

      // Validar senha do usuário atual
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuário não encontrado');
      }

      // Reautenticar com a senha fornecida
      await signInWithEmailAndPassword(auth, user.email, password);
      
      // Se chegou até aqui, a senha está correta
      await onConfirm(password);
      
      // Limpar formulário
      setPassword('');
      setShowPassword(false);
      setValidationError('');
      
    } catch (error: unknown) {
      console.error('Erro ao validar senha:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/wrong-password') {
          setValidationError('Senha incorreta');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          setValidationError('Muitas tentativas. Tente novamente mais tarde.');
        } else {
          setValidationError('Erro ao validar senha. Tente novamente.');
        }
      } else {
        setValidationError('Erro ao validar senha. Tente novamente.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setValidationError('');
    onClose();
  };

  if (!empresa) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Empresa
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Todos os dados da empresa e registros relacionados serão permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Empresa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {empresa.nome_fantasia}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Razão Social:</span>
                  <p className="text-muted-foreground">{empresa.razao_social}</p>
                </div>
                <div>
                  <span className="font-medium">CNPJ:</span>
                  <p className="text-muted-foreground">{empresa.cnpj}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{contatosCount}</span>
                  <span className="text-muted-foreground">contatos</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{logsCount}</span>
                  <span className="text-muted-foreground">logs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de Impacto */}
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta exclusão também removerá todos os {contatosCount} contatos e {logsCount} logs relacionados a esta empresa.
            </AlertDescription>
          </Alert>

          {/* Validação de Senha */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Confirme sua senha para continuar
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Digite sua senha atual"
                className={validationError ? 'border-destructive' : ''}
                disabled={isValidating || isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isValidating || isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isValidating || isLoading}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!password.trim() || isValidating || isLoading}
            className="min-w-[120px]"
          >
            {isValidating ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Validando...
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Excluindo...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir Empresa
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
