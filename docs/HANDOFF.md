# Handoff técnico — Sevilha SaaS

**Atualizado:** 13/10/2026 · **HEAD:** ac7ab98 · **Branch:** main

## Estado real

- Repo: github.com/SevilhaBarbearia/barbearia-sevilha
- Produção: barbearia-app-agenda-six.vercel.app
- Testes: 52/52 verdes
- Banco: migrations 001–033 aplicadas

## Concluído nesta sessão

| Bloco | Descrição | Banco | Git |
|---|---|---|---|
| 030 | Fix account takeover guest booking | sim | sim |
| 031 | E-mail confirmado no claim | sim | sim |
| 032 | Platform Admin edita tenant + logo | sim | sim |
| 033 | Onboarding por convite | sim | sim |
| — | Login independente `/plataforma/login` | — | sim |
| — | Redesign `/plataforma` (KPIs + tabela + modal) | — | sim |
| — | Modal responsivo (mobile/tablet/desktop) | — | sim |
| — | `/primeiro-acesso` (define senha via convite) | — | sim |
| — | Modal "Links" por tenant na `/plataforma` | — | sim |
| — | Fix `/api/auth/activity` (cria sessão no 1º acesso) | — | sim |
| — | Playwright baseline (mobile + desktop) | — | sim |
| — | Tokens `src/app/tokens.css` | — | sim |
| — | Docs consolidados (PRD, SYS, README, CHANGELOG, HANDOFF, PROTOCOLO) | — | sim |

## Pendente

| Item | Prioridade |
|---|---|
| Botão "Trocar e-mail de login" na `/plataforma/[slug]` | P1 |
| Botão "Gerar link de recuperação" (dono esqueceu senha) | P1 |
| P2 responsividade — `/admin/{slug}` | P1 |
| P3 responsividade — `/{slug}` e `/{slug}/cliente` | P2 |
| P4 responsividade — `/plataforma/[slug]` | P2 |
| Bloco 034 — rate limit booking (modo sombra) | P2 |
| Bloco 035 — expiração `pending` guest (modo sombra) | P2 |
| Fila virtual — discovery | P0 cliente |
| LGPD — política de privacidade + termos + DPA | P2 |
| Aplicar `ui_version = 'dark-premium'` como terceira opção | P3 |

## Fluxo de onboarding de tenant (novo)

1. Admin em `/plataforma` → **Nova barbearia** → 3 campos (nome, slug, e-mail do dono).
2. Sistema cria tenant + RPC `platform_create_tenant_pending_owner` + `auth.admin.generateLink({ type: 'invite' })`.
3. Modal mostra 3 links: **convite**, **painel admin**, **página pública**.
4. Admin copia link de convite → manda por WhatsApp.
5. Dono clica → `/primeiro-acesso` → define senha → entra em `/admin/{slug}`.

**Um e-mail = um dono de tenant.** Índice único parcial em `barbershop_members`.

## RPCs e funções relevantes

- `create_barbershop_with_owner` (029) — fluxo antigo, ainda existe
- `platform_create_tenant_pending_owner` (033) — novo, sem exigir dono existente
- `handle_new_user` (033) — ativa `barbershop_members` se convite pendente
- `platform_change_subscription`, `platform_set_feature_override`, `platform_set_ui_version`, `platform_open_support_session`, `platform_update_barbershop` (029/032)
- `write_platform_audit` (029) — **exige** `is_platform_admin()`. Não usar em triggers de Auth
- `is_platform_admin` (010) — exige `is_platform_admin` + sessão por senha
- `book_guest_appointment` (023/030) — sem sobrescrever identidade existente
- `claim_my_guest_appointments` (026/031) — exige `email_confirmed_at`

## ADRs

001 Banco + RLS · 002 RPCs transacionais · 003 Sem checkout online · 004 Guest com e-mail confirmado · 005 Sessão 30min · 006 Platform Admin independente · 007 Fila virtual separada · 008 Resend (pendente config) · 009 `ui_version` por tenant · 010 Onboarding por convite

## Variáveis e segredos

- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `UI_FORCE_LEGACY`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY` (Vercel + `.env.local`)
- Edge Function: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`
- Vault cron: `barbershop_project_url`, `barbershop_service_role_key`

## Pontos de atenção

- Logs de server action aparecem no **terminal**, não no browser.
- Token de convite: **não abrir no mesmo navegador** com sessão ativa da plataforma.
- `set session_replication_role = replica` antes de `delete from barbershops` (evita FK em `audit_logs`).
- Migration que toca `auth.users` → ajustar fixture PGlite no mesmo commit.

## Prompt para próxima IA

Continue o projeto verificando `docs/PROTOCOLO.md` e `docs/HANDOFF.md`. Prioridade: botões "Trocar e-mail" e "Gerar link de recuperação" na tela `/plataforma/[slug]`. Depois: responsividade P2 (`/admin/{slug}`). Trabalhe na `main`, blocos agrupados, tag `pre-bloco-N`, testes verdes antes de commitar. Fila virtual é o objetivo central, mas depende de discovery das 10 decisões de produto.
