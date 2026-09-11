# Acesso administrativo separado

## Uso diário

- Clientes: `/login`, com Google, para suas próprias reservas.
- Administração: `/admin/login`, com e-mail e senha de uma conta administrativa previamente criada.
- Painel: `/admin`, com reservas de todos os clientes, agenda, serviços, barbeiros, horários, pagamentos e faturamento.
- O botão “Sair da administração” encerra a sessão neste navegador.

Não existe cadastro público de administradores nem senha padrão no código.
Conhecer o endereço `/admin` não concede acesso. Conta comum, conta inativa ou sessão somente Google é encaminhada ao login administrativo. A migração também exige senha nas políticas do banco que usam `is_admin()`.
Cliente e administrador usam a mesma sessão do Supabase no navegador: entrar em outra conta substitui a sessão atual. Para usar ambos ao mesmo tempo, abra outro perfil de navegador.

## Implantação — uma vez pelo responsável técnico

1. No Supabase, habilite autenticação por e-mail/senha, mantendo o Google para clientes.
2. Execute `supabase/migrations/008_acesso_administrativo.sql` no SQL Editor, depois das migrações 001 a 007. Não recrie tabelas nem apague reservas.
3. Em Authentication > Users, crie a conta específica do responsável com e-mail próprio e senha forte e exclusiva. Confirme o e-mail pela ferramenta administrativa se necessário. Use um e-mail diferente das contas de clientes.
4. Copie o UUID dessa conta em Authentication > Users. No SQL Editor, substitua o marcador abaixo pelo UUID real e execute:

```sql
update public.profiles
set role = 'admin', provider = 'manual', is_active = true
where id = 'COLE_O_UUID_DA_CONTA_ADMIN'::uuid
returning id, email, role, is_active;
```

A consulta deve retornar exatamente a conta escolhida. Se não retornar nenhuma linha, confira se as migrações anteriores e o trigger `on_auth_user_created` estão instalados. Não use o e-mail editável de `profiles` como critério de concessão.

5. Publique o projeto atualizado na Vercel com as variáveis públicas do Supabase existentes. A senha não entra no `.env`, no código ou no repositório.
6. Entre em `/admin/login` usando a conta criada. Entregue ao cliente apenas URL, e-mail e senha por canal privado. O cliente não precisa acessar Supabase nem executar SQL.

Administradores antigos que entravam pelo Google precisarão de uma conta com senha para continuar administrando. Esta migração não remove papéis antigos automaticamente; revise e desative contas que não devem mais ter acesso.

## Validação em homologação

1. Sem sessão: `/admin` e `/admin/reservas` devem levar a `/admin/login`.
2. Cliente Google: mesmas URLs não mostram dados administrativos; suas reservas continuam acessíveis na área do cliente.
3. Conta comum com senha: login administrativo deve recusar acesso.
4. Admin ativo com senha: painel lista reservas de todos os clientes; ações de administração continuam disponíveis.
5. Mesmo admin autenticado apenas pelo Google: não obtém acesso administrativo.
6. Admin inativo: não acessa o painel, mesmo com senha correta.
7. Após sair: abrir novamente uma URL administrativa deve pedir login.
8. Como cliente, tentativas via API de inserir perfil admin, mudar `role` ou `is_active` devem falhar.

Recuperação de senha nesta versão é feita pelo responsável técnico com as ferramentas administrativas do Supabase; não há fluxo público de recuperação implementado.

Referências: https://supabase.com/docs/guides/auth/jwt-fields e https://supabase.com/docs/reference/javascript/auth-getclaims.
