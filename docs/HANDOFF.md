# Handoff técnico — Sevilha SaaS

**Atualizado:** 13/10/2026
**Branch:** `main`
**HEAD:** `5cd1e9c`

## 1. Resumo

Plataforma multi-tenant de barbearias. Next.js + TS + Supabase/PostgreSQL + Vercel. Fila virtual é o objetivo central, ainda não implementada. Onboarding seguro de tenant é a próxima sprint prioritária.

## 2. Estado real

- Repositório: github.com/SevilhaBarbearia/barbearia-sevilha
- Deploy produção: barbearia-app-agenda-six.vercel.app
- Testes: **52/52 verdes** (`npm test`)
- Banco: migrations 001–032 aplicadas (`032_platform_admin_edit_tenant`)

## 3. Blocos concluídos

| Bloco | Descrição | Banco | Git |
|---|---|---|---|
| 029 | Fundação Platform Admin | sim | sim |
| 030 | Fecha account takeover em guest booking | sim | sim |
| 031 | Exige e-mail confirmado no claim | sim | sim |
| 032 | Platform Admin edita tenant + upload de logo | sim | sim |
| — | Login independente `/plataforma/login` | — | sim |
| — | Baseline Playwright (mobile + desktop) | — | sim |
| — | Tokens de design (`src/app/tokens.css`) | — | sim |
| — | Redesign `/plataforma` no padrão admin | — | sim |
| — | KPIs + tabela densa + modal de novo tenant | — | sim |
| — | Edição de tenant com upload de logo processado no cliente | — | sim |

## 4. Blocos pendentes

| Bloco | Descrição | Prioridade |
|---|---|---|
| Onboarding seguro | Convite em vez de senha temporária | **P0** |
| 033 | Rate limit em booking (modo sombra, fail-open) | P1 |
| 034 | Expiração de `pending` guest (modo sombra) | P1 |
| Fila virtual | Discovery + modelagem | P0 (após onboarding) |
| Design system | Aplicar tokens em todos os componentes | P2 |
| LGPD | Retenção, exclusão, anonimização, DPA | P2 |
| Docs | Política de privacidade + termos de uso | P2 |

## 5. Migrations aplicadas

001–032. Destaques:
- `028_structured_no_show.sql`
- `029_platform_admin_foundation.sql`
- `030_fix_guest_booking_takeover.sql`
- `031_endurecer_claim_identity.sql`
- `032_platform_admin_edit_tenant.sql`

Rollbacks em `supabase/rollbacks/` (não são migrations).

## 6. RPCs e funções relevantes

- `create_barbershop_with_owner` (029) — cria tenant + associa dono existente. **Exige que a conta do dono já exista em `auth.users`.**
- `platform_change_subscription` (029) — muda plano/status com motivo obrigatório.
- `platform_set_feature_override` / `platform_clear_feature_override` (029).
- `platform_set_ui_version` (029).
- `platform_open_support_session` / `platform_close_support_session` (029).
- `platform_update_barbershop` (032) — edita nome/slug/e-mail/logo do tenant.
- `write_platform_audit` (029) — auditoria de ações do Platform Admin.
- `book_guest_appointment` (023) — reserva sem conta, corrigida pela 030.
- `claim_my_guest_appointments` (026) — endurecida pela 031.
- `is_platform_admin` (010) — exige `is_platform_admin` + sessão por senha.

## 7. Autenticação

- **Cliente:** Google OAuth + guest (nome + telefone, e-mail opcional).
- **Admin de tenant:** e-mail/senha. Guard `obterAdministradorAtual`.
- **Platform Admin:** `/plataforma/login` com guard próprio `obterPlatformAdminAtual`. Não exige `role='admin'`. Não dá acesso operacional a tenant.
- **Sessão:** 30 min de inatividade, `check_current_app_session`, access token 1800s.

## 8. Fila virtual (pendente)

**Estados propostos:** `waiting → called → in_service → completed` (+ `canceled`, `no_show`).

**Decisões em aberto (10 perguntas):**
1. Fila por unidade, barbeiro ou serviço?
2. Reserva entra automaticamente na fila após check-in?
3. Walk-in sem agendamento entra?
4. Ordem entre agendado e chegada?
5. Prioridade manual? Quem autoriza?
6. Tolerância após chamada?
7. Posição e tempo estimado visíveis ao público?
8. Cliente atrasado ou que não responde?
9. Reentrada ou nova entrada?
10. Canais de aviso (WhatsApp, e-mail) e consentimento?

**Arquitetura proposta:** tabelas próprias (`queue_entries`, `queue_events`); RPCs transacionais; eventos auditáveis; Supabase Realtime como transporte (banco é a fonte); posição atômica no banco; idempotência; RLS; UI mobile-first.

## 9. Onboarding seguro de tenant

Detalhes em `docs/SPRINT-ONBOARDING.md`. Resumo:
- Convite por e-mail (`inviteUserByEmail`), sem senha temporária.
- Ordem: tenant primeiro (transação), convite depois.
- Fila de e-mail com retry (`outbound_notifications`), não envio síncrono.
- Feature flag para rodar em paralelo ao fluxo manual.
- Pendências: SMTP próprio (ou aceitar limitação do relay Supabase), DPA, política de privacidade.

## 10. ADRs

- **001** Banco compartilhado + RLS.
- **002** RPCs para transições.
- **003** Sem checkout online.
- **004** Guest com identidade limitada (e-mail confirmado a partir da 031).
- **005** Sessão 30min server-side.
- **006** Platform Admin independente.
- **007** Fila virtual separada.
- **008** Notificações assíncronas via Resend.
- **009** `ui_version` por tenant (`legacy`, `warm-premium`, futuramente `dark-premium`).
- **010** Onboarding por convite, sem senha temporária.

## 11. Próximos passos

1. **Sprint de onboarding seguro** (P0) — ver `docs/SPRINT-ONBOARDING.md`.
2. **Fila virtual** — discovery das 10 perguntas antes de qualquer migration.
3. **Blocos 033/034** (P1) — rate limit e expiração em modo sombra.
4. **LGPD** — ler `docs/PRIVACY_BACKLOG.md`, montar plano com DPA, política e termos.
5. **Design system** — aplicar tokens (`src/app/tokens.css`) em todos os componentes.

## 12. Variáveis e segredos

**Web:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `UI_FORCE_LEGACY`.

**Edge Function:** `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`.

**Vault (cron):** `barbershop_project_url`, `barbershop_service_role_key`.

**Nunca** colocar segredo sob prefixo `NEXT_PUBLIC_`.

## 13. Pontos de atenção

- Banco real pode divergir das migrations. Sempre verificar antes de aplicar.
- Fila de e-mail ≠ fila virtual.
- `canceled_at` isolado não distingue cancelamento comum de no-show — usar `status` e `no_show_at`.
- Trial: 15 dias para novos tenants.
- Trabalhar na `main`, blocos agrupados, migrations separadas, tag `pre-bloco-N` antes de cada bloco.
- Toda migration que toca `auth.users` exige ajuste no fixture PGlite no mesmo commit.

## 14. Prompt para próxima IA

> Continue o projeto verificando estado atual do repositório e do banco antes de alterar. Leia `docs/PROTOCOLO.md`, `docs/HANDOFF.md` e `docs/SPRINT-ONBOARDING.md`. Não invente comportamento. Fila virtual é objetivo central, mas feche as 10 decisões de produto antes de migration. Onboarding seguro é P0. Mantenha RLS, autorização por tenant, transações, eventos, idempotência, testes. Trabalhe direto na `main`; só declare testes verdes quando executar o gate no código atual.
