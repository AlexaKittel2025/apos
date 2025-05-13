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
```bash
npm run dev
# ou
yarn dev
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

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes. 