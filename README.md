# Sevilha Barbearia

Aplicativo web profissional para barbearia com vitrine pública, reserva online, área do cliente, painel administrativo e controle de pagamentos presenciais.

Este projeto foi estruturado em português do Brasil, com foco em código limpo, manutenção simples e evolução futura.

## Stack

- Next.js com TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security no banco
- Deploy preparado para Vercel
- Validação com Zod

## O que está incluído

- Login com Google via Supabase Auth
- Tela obrigatória para completar telefone/WhatsApp após primeiro login
- Perfil de cliente salvo para contato posterior
- Página pública com serviços e barbeiros
- Fluxo de reserva com serviço, barbeiro, data e horário disponível
- Cálculo de horários disponíveis respeitando expediente, pausa, bloqueios e reservas ativas
- Área do cliente com agendamentos, perfil e histórico
- Painel administrativo com dashboard, agenda do dia, reservas, pagamentos e faturamento básico
- Registro de pagamento presencial sem checkout online
- Migrations SQL com tabelas, constraints, views, funções, triggers e RLS
- Documentação para Supabase e Vercel

## Estrutura

```txt
src/
  app/                    # Rotas Next.js App Router
  components/             # Componentes reutilizáveis de UI, layout e formulários
  lib/
    agendamentos/         # Regras de reserva, validações e server actions
    auth/                 # Permissões e provider de autenticação
    db/                   # Tipos TypeScript principais
    supabase/             # Clientes Supabase server/browser
supabase/
  migrations/             # SQL do banco, RLS e funções
  seed.sql                # Dados iniciais de desenvolvimento
docs/
  CONFIGURACAO_SUPABASE.md
  DEPLOY_VERCEL.md
  ROADMAP.md
```

## Como rodar localmente

1. Instale as dependências:

```bash
npm install
```

2. Copie as variáveis de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Execute as migrations no Supabase SQL Editor, na ordem:

```txt
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/003_functions.sql
supabase/migrations/004_admin_crud_grants.sql
supabase/migrations/005_branding_sevilha.sql
supabase/seed.sql
```

5. Configure o provedor Google no Supabase Auth.

6. Rode o projeto:

```bash
npm run dev
```

Acesse: `http://localhost:3000`

## Como tornar um usuário administrador

Após fazer login com Google uma vez, o perfil será criado em `profiles`. No SQL Editor, execute:

```sql
update public.profiles
set role = 'admin'
where email = 'seuemail@gmail.com';
```

Depois acesse `/admin`.

## Observações de segurança

- Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- A aplicação usa RLS nas tabelas sensíveis.
- O banco possui constraint para impedir conflito de horários ativos do mesmo barbeiro.
- O cliente só deve acessar os próprios agendamentos.
- Admin acessa o painel e dados operacionais.
- Pagamentos são apenas registros presenciais, sem integração de checkout.

## Próximas evoluções recomendadas

- CRUD completo visual para serviços, barbeiros, horários e bloqueios.
- Confirmação automática por WhatsApp.
- Perfil de barbeiro com agenda própria.
- Relatórios avançados por período, serviço e barbeiro.
- Comissão por barbeiro.
- Múltiplas unidades.
- Modo SaaS para várias barbearias.

## Critério de aceite do MVP

- Cliente consegue logar com Google.
- Cliente completa telefone/WhatsApp obrigatório.
- Cliente escolhe serviço, barbeiro, data e horário.
- Sistema salva reserva e não permite conflito para o mesmo barbeiro.
- Admin visualiza reserva no painel.
- Admin registra pagamento presencial.
- Faturamento considera apenas pagamentos presenciais marcados como `paid`.


## Atualização de layout

Esta versão inclui uma camada visual mais profissional: logo, ilustração de barbearia, botões mais claros, cards com imagem, home mais premium, tela de reserva guiada e painel administrativo com navegação visual.

Veja também: `docs/GUIA_LAYOUT.md`.

## Atualização: horários e bloqueios administrativos

A tela `/admin/horarios` agora possui CRUD funcional para expediente semanal e bloqueios específicos.

Funcionalidades disponíveis:

- cadastrar expediente por barbeiro;
- editar expediente;
- ativar/desativar expediente;
- excluir expediente;
- criar bloqueio específico;
- remover bloqueio específico.

Essas regras já são usadas no cálculo de horários disponíveis da reserva.

Leia também: `docs/GUIA_HORARIOS_BLOQUEIOS.md`.

## Responsividade e densidade visual

A versão atual inclui ajustes de responsividade para reduzir tamanhos de fontes, cards, botões e imagens em telas menores sem alterar as funcionalidades já implementadas. Consulte `docs/GUIA_RESPONSIVIDADE.md`.


## Ajustes visuais recentes

- Nome público atualizado para **Sevilha Barbearia**.
- Logo com espaçamento reforçado entre ícone e texto.
- Botões principais com largura e espaçamento mais claros.
- Botões de horários disponíveis com área clicável maior e melhor respiro visual.
- Cards de serviços reorganizados para manter duração e nome separados, evitando sobreposição em telas menores.

Esses ajustes são apenas de apresentação e não alteram autenticação, banco, RLS, reservas, CRUD administrativo ou cálculo de horários.
