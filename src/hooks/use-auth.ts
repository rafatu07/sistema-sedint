import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

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
