# Green Game

Um jogo de apostas onde os jogadores tentam adivinhar se a linha terminará acima ou abaixo do meio.

## Funcionalidades

- Sistema de autenticação (login/registro)
- Perfil do usuário
- Sistema de apostas
- Depósitos e saques
- Painel administrativo
- Estatísticas do jogo

## Tecnologias Utilizadas

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- NextAuth.js
- Socket.IO

## Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL
- npm ou yarn

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/green-game.git
cd green-game
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
DATABASE_URL="postgresql://user:password@localhost:5432/green_game"
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="seu-jwt-secret-aqui"
```

4. Execute as migrações do banco de dados:
```bash
npx prisma migrate dev
```

5. Inicie o servidor de desenvolvimento:

**Para ambiente normal:**
```bash
npm run dev
# ou
yarn dev
```

**Para Windows (opção mais confiável):**
```bash
npm run dev:windows
# ou
yarn dev:windows
```

**Para qualquer sistema (recomendado):**
```bash
npm run dev:run
# ou
yarn dev:run
```

**Para limpar o cache e iniciar:**
```bash
npm run dev:clean
# ou
yarn dev:clean
```

**Caso nenhuma das opções funcione:**
```bash
npm run clean
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

```
src/
  ├── components/     # Componentes React
  ├── pages/         # Páginas e APIs
  ├── styles/        # Estilos globais
  └── types/         # Definições de tipos TypeScript
```

## Uso

1. Acesse `http://localhost:3000`
2. Crie uma conta ou faça login
3. Adicione saldo à sua conta
4. Faça apostas no jogo
5. Acompanhe seus resultados

## Painel Administrativo

1. Acesse `http://localhost:3000/admin`
2. Faça login com uma conta de administrador
3. Visualize estatísticas do jogo
4. Ajuste o lucro da casa

## Solucionando Problemas de Cache no Windows/WSL

Se você estiver enfrentando problemas com o cache do webpack no Windows ou WSL, tais como erros `ENOENT` ou problemas de renomeação de arquivos, foram implementadas várias soluções:

1. **Scripts Otimizados para Windows**
   - **`npm run dev:windows`** - Executa um arquivo batch especializado (mais confiável)
   - **`npm run dev:run`** - Script universal compatível com todos os sistemas
   - Limpa automaticamente o cache antes de iniciar
   - Configura variáveis de ambiente otimizadas
   - Usa polling para melhor detecção de alterações em arquivos

2. **Comando de Limpeza** (`npm run clean`)
   - Remove completamente o diretório `.next`
   - Resolve problemas persistentes de cache

3. **Configurações Especiais**
   - Arquivo `.env.development` com configurações específicas para desenvolvimento
   - Ajustes no webpack para evitar problemas de compressão
   - Uso de caminhos absolutos para o diretório de cache

Estas melhorias garantem uma experiência de desenvolvimento mais estável em ambientes Windows/WSL.

## Melhorias no Sistema de Chat

As seguintes correções e otimizações foram aplicadas para resolver o problema de loop infinito de requisições ao servidor:

### 1. Painel de Admin (`src/pages/admin/index.tsx`)

- Adicionada verificação de `document.visibilityState` para evitar requisições desnecessárias quando a página não está visível
- Implementada variável `isUpdating` para prevenir chamadas recursivas e simultâneas à API
- Aumentado o intervalo entre atualizações de 10 para 15 segundos
- Adicionada finalização adequada de requisições com `.finally()` para garantir a liberação do bloqueio

### 2. Perfil do Usuário (`src/app/profile/page.tsx`)

- Adicionado listener de evento `visibilitychange` para atualizar apenas quando a página está visível
- Modificada a função `fetchChatMessages` para retornar Promise e permitir controle de finalização
- Implementada verificação para evitar requisições redundantes
- Aumentado o intervalo entre atualizações de 5 para 15 segundos
- Adicionada filtragem de mensagens do lado do cliente para reduzir processamento

### 3. API de Mensagens (`src/pages/api/chat/messages.ts`)

- Otimizada a filtragem de mensagens para evitar loops desnecessários
- Removidos logs verbosos que geravam sobrecarga no servidor
- Melhorada a lógica de marcação de mensagens como lidas, processando apenas mensagens não lidas
- Implementado processamento por lotes para melhorar performance

### 4. API de Usuários (`src/pages/api/chat/users.ts`)

- Adicionado sistema de cache para reduzir processamento repetitivo
- Implementada filtragem apenas das mensagens recentes (últimas 100) para verificar novas mensagens
- Removidos usuários simulados desnecessários que causavam confusão
- Aplicada limpeza de mensagens antigas antes do processamento

Estas melhorias combinadas resultaram em:
- Redução significativa no número de chamadas à API
- Eliminação de loops infinitos
- Melhor experiência para usuários e administradores
- Menor carga no servidor e no banco de dados

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes. 