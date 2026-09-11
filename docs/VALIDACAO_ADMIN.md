# Validação desta atualização

- Build de produção Next.js concluído, incluindo verificação TypeScript.
- 12 testes da regra de autorização passaram: conta admin ativa com senha, Google, cliente, barbeiro, conta inativa, identidade divergente, metadados e refresh.
- 12 verificações em PostgreSQL local embarcado (PGlite), com fixture de perfis e auth: migração executada, admin/senha, bloqueio de alteração de privilégios, atualização de contato e reaplicação da migração.
- O build usou configuração fictícia de Supabase, sem credenciais reais. Não valida conectividade com o projeto em produção.
- Teste HTTP local impedido pelo erro de interfaces de rede do ambiente (uv_interface_addresses). Login completo, cookies e saída devem ser verificados em homologação conforme ACESSO_ADMINISTRATIVO.md.
- Nada foi publicado na Vercel e nenhuma conta ou migração foi aplicada ao Supabase real.

## Alterações adicionais necessárias ao build

Corrigidos dois erros de tipos existentes em src/components/ui/Input.tsx: children tipado como ReactNode e propriedades do botão do Select compatíveis com HTMLButtonElement.
Incluído package-lock.json para repetir as versões usadas no build. Instalar com npm ci.

## Reexecutar os testes de autorização

Com Node.js 24: npm run test:admin.
