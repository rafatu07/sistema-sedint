import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "@/components/auth/LoginPage";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/pages/Dashboard";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const queryClient = new QueryClient();

// Componente interno que usa o contexto de autenticação
const AppContent = () => {
  const { currentUser, loading, logout, updateUserProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {!currentUser ? (
        <LoginPage onLogin={() => {}} /> // onLogin não é mais necessário pois o contexto gerencia isso
      ) : (
        <div className="min-h-screen">
          <Header user={currentUser} onLogout={handleLogout} onUpdateUser={updateUserProfile} />
          <Dashboard user={currentUser} />
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
