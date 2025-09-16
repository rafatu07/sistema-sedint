# Sistema de Gestão de Contratos 2025

Sistema web para gestão e acompanhamento de contratos administrativos.

## Funcionalidades

- ✅ Autenticação de usuários via Firebase
- ✅ Gerenciamento de contratos administrativos
- ✅ Registro de andamentos com data, local e observações
- ✅ Histórico completo de mudanças
- ✅ Interface moderna e responsiva
- ✅ Filtros e busca avançada

## Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/ui + Lucide Icons
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Gerenciamento de Estado**: React Context API + TanStack Query

## Como Executar

Pré-requisitos:
- Node.js 18+ 
- npm ou yarn

```sh
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>

# 2. Entre no diretório
cd gestao-contratos

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente
# Crie um arquivo .env.local com as configurações do Firebase

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── pages/              # Páginas da aplicação
├── contexts/           # Context API para gerenciamento de estado
├── lib/                # Utilitários e configurações
├── types/              # Definições de tipos TypeScript
└── hooks/              # Custom hooks
```

## Configuração do Firebase

O projeto utiliza Firebase para:
- **Authentication**: Login/logout de usuários
- **Firestore**: Banco de dados para contratos e histórico  
- **Storage**: Upload de arquivos (futuro)

Configure as variáveis de ambiente no arquivo `.env.local`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
