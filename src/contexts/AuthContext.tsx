import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authService, userService } from '@/lib/firebase-services';
import type { User } from '@/types/process';
import type { LoginCredentials, RegisterCredentials } from '@/types/firebase';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Em desenvolvimento, pode haver problemas de hot-reloading
    if (import.meta.env.DEV) {
      console.warn('Contexto de autenticação não encontrado. Isso pode ser devido a hot-reloading.');
      // Retorna um contexto temporário para evitar crash em desenvolvimento
      return {
        currentUser: null,
        firebaseUser: null,
        loading: true,
        error: null,
        login: async () => {},
        register: async () => {},
        logout: async () => {},
        updateUserProfile: async () => {},
        clearError: () => {},
        sendPasswordReset: async () => {}
      };
    }
    console.error('Erro: useAuth deve ser usado dentro de um AuthProvider');
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para limpar erros
  const clearError = () => setError(null);

  // Função para atualizar dados do perfil do usuário
  const updateUserProfile = async (userData: Partial<User>) => {
    if (!currentUser) {
      throw new Error('Usuário não está logado');
    }

    try {
      setLoading(true);
      setError(null);

      // Preparar dados para Firestore (remover undefined)
      const updateData: any = {};
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.telefone !== undefined) updateData.telefone = userData.telefone || null;
      if (userData.endereco !== undefined) updateData.endereco = userData.endereco || null;

      // Atualizar no Firestore
      await userService.updateUser(currentUser.id, updateData);

      // Atualizar perfil no Firebase Auth se nome mudou
      if (firebaseUser && userData.name) {
        await updateProfile(firebaseUser, {
          displayName: userData.name,
        });
      }

      // Atualizar estado local
      setCurrentUser(prev => prev ? { ...prev, ...userData } : null);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar perfil';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer login
  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const firebaseUser = await authService.login(credentials);
      
      // Buscar dados do usuário no Firestore
      const userData = await userService.getUserByUid(firebaseUser.uid);
      
      if (!userData) {
        throw new Error('Dados do usuário não encontrados');
      }

      // Converter para formato local
      const localUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      };

      setCurrentUser(localUser);
      setFirebaseUser(firebaseUser);
      
      console.log('Login realizado com sucesso:', localUser.name);
    } catch (err: any) {
      console.error('Erro no login:', err);
      
      // Tratar erros específicos do Firebase
      let errorMessage = 'Erro desconhecido no login';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Usuário desabilitado';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        default:
          errorMessage = err.message || 'Erro ao fazer login';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Função para registrar novo usuário
  const register = async (credentials: RegisterCredentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validações básicas
      if (!credentials.name || credentials.name.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres');
      }
      
      if (!credentials.email || !credentials.email.includes('@')) {
        throw new Error('Email inválido');
      }
      
      if (!credentials.password || credentials.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }
      
      // Forçar role como admin para todos os usuários
      const credentialsWithAdminRole = {
        ...credentials,
        role: 'admin' as const
      };
      
      await authService.register(credentialsWithAdminRole);
      
      console.log('Usuário registrado com sucesso como admin');
      
      // Após registrar, fazer login automático
      await login({
        email: credentials.email,
        password: credentials.password
      });
      
    } catch (err: any) {
      console.error('Erro no registro:', err);
      
      let errorMessage = 'Erro desconhecido no registro';
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está em uso';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Registro não permitido. Contate o administrador';
          break;
        default:
          errorMessage = err.message || 'Erro ao criar conta';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer logout
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.logout();
      
      setCurrentUser(null);
      setFirebaseUser(null);
      
      console.log('Logout realizado com sucesso');
    } catch (err: any) {
      console.error('Erro no logout:', err);
      setError('Erro ao fazer logout');
      throw new Error('Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  };

  // Função para redefinir senha
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email || !email.includes('@')) {
        throw new Error('Email inválido');
      }
      
      await authService.resetPassword(email);
      
      console.log('Email de redefinição enviado para:', email);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      
      let errorMessage = 'Erro ao redefinir senha';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        default:
          errorMessage = err.message || 'Erro ao redefinir senha';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Observar mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        
        if (firebaseUser) {
          // Usuário logado - buscar dados no Firestore
          const userData = await userService.getUserByUid(firebaseUser.uid);
          
          if (userData && userData.is_active) {
            const localUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
            };
            
            setCurrentUser(localUser);
            setFirebaseUser(firebaseUser);
            
            // Atualizar último login
            await userService.updateUser(userData.id, {
              last_login: new Date() as any,
            });
            
            console.log('Usuário autenticado:', localUser.name);
          } else {
            // Usuário não encontrado ou desabilitado
            setCurrentUser(null);
            setFirebaseUser(null);
            if (!userData) {
              console.warn('Dados do usuário não encontrados no Firestore');
            } else {
              console.warn('Usuário desabilitado');
            }
          }
        } else {
          // Usuário não logado
          setCurrentUser(null);
          setFirebaseUser(null);
        }
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        setCurrentUser(null);
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
