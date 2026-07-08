# Guia de configuração do Supabase

## 1. Criar projeto

Crie um novo projeto no Supabase e anote:

- Project URL
- anon public key

Essas informações vão no `.env.local`.

## 2. Rodar SQL

No painel do Supabase, abra **SQL Editor** e execute, nesta ordem:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/seed.sql` somente para desenvolvimento

## 3. Configurar Google Login

Em **Authentication > Providers > Google**:

1. Ative o provedor Google.
2. Informe Client ID e Client Secret do Google Cloud.
3. Configure a URL de callback indicada pelo próprio Supabase no Google Cloud.
4. Em **URL Configuration**, adicione:
   - `http://localhost:3000/auth/callback`
   - `https://seu-dominio.com/auth/callback`

## 4. Telefone obrigatório

O login por Google não garante telefone. Por isso, após o primeiro login, o sistema redireciona para `/completar-cadastro` se `profiles.phone` estiver vazio.

## 5. Login por telefone futuro

A arquitetura já separa autenticação, perfil e contato. Para OTP/SMS/WhatsApp futuramente:

- adicionar provedor de telefone no Supabase ou gateway externo;
- manter `profiles.phone` como fonte de contato;
- atualizar `provider` para `phone` quando o cadastro vier desse fluxo;
- manter a reserva dependente de perfil completo.

## 6. Criar admin

Depois de logar pela primeira vez:

```sql
update public.profiles
set role = 'admin'
where email = 'seuemail@gmail.com';
```

## 7. RLS

As policies estão em `002_rls.sql`. Elas garantem:

- cliente vê o próprio perfil e agendamentos;
- admin vê tudo;
- barbeiro, quando vinculado a `profile_id`, vê a própria agenda;
- serviços e barbeiros ativos aparecem na vitrine pública;
- pagamentos presenciais são gerenciados por admin/barbeiro autorizado.
