# Instruções para Claude Code

Este é um projeto baseado em **Next.js 14** com suporte a TypeScript, React e rotas via `/app` ou `/pages`.

Sempre use **português do Brasil** nas respostas, explicações, comentários e mensagens de commit.

### Objetivos:
- Identificar e corrigir automaticamente erros.
- Refatorar código para manter organização e performance.
- Aplicar boas práticas de Next.js e React.
- Explicar o que foi feito com comentários no código, se necessário.

### Boas práticas que devem ser seguidas:
- Separar componentes em pastas por domínio.
- Usar `use client` apenas quando realmente necessário.
- Usar `useEffect`/`useState` com cuidado em Server Components.
- Usar API routes ou arquivos em `/app/api` com validação e segurança.
- Manter pastas organizadas em `components/`, `hooks/`, `lib/`, `app/` etc.

### Estilo de código:
- Código limpo, organizado, com indentação consistente.
- Preferência por arrow functions e hooks.
- Comentários úteis, apenas quando necessário.

