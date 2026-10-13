# Handoff — Sevilha SaaS
**Atualizado:** 13/10/2026 · **Branch:** main

## Estado
- Repo: github.com/SevilhaBarbearia/barbearia-sevilha
- Produção: barbearia-app-agenda-six.vercel.app
- Último commit conhecido: 29a5e00 (fix(seguranca): exige e-mail confirmado para claim de reserva guest (031))
- Testes: 52/52 verdes (npm test)

## Blocos concluídos
029 Fundação Platform Admin (banco+git) · 030 Fecha account takeover guest booking (banco+git) · 031 Exige e-mail confirmado no claim (banco+git) · Login independente /plataforma/login (git) · Baseline Playwright (git) · Tokens src/app/tokens.css (pendente de commit).

## Blocos pendentes
032 Expiração de pending guest (modo sombra) · 033 Rate limit em booking (modo sombra, fail-open) · Fila virtual (discovery) · Design 2 direções + implementação · LGPD retenção.

## Migrations aplicadas
001–031. Destaques: 028_structured_no_show.sql · 029_platform_admin_foundation.sql · 030_fix_guest_booking_takeover.sql · 031_endurecer_claim_identity.sql. Rollbacks em supabase/rollbacks/.

## Platform Admin (RESOLVIDO)
/plataforma/login. Guard obterPlatformAdminAtual exige is_platform_admin && is_active && senha. Não exige role='admin'. Platform Admin não é owner/manager de tenant.

## Fila virtual
Estados propostos: waiting → called → in_service → completed (+ canceled, no_show).
Decisões abertas: fila por unidade/barbeiro/serviço? reserva entra automaticamente? walk-in? ordem entre agendado e chegada? prioridade? tolerância após chamada? posição/tempo visíveis? cliente atrasado? reentrada? canais de aviso?
Arquitetura: tabelas próprias; RPCs transacionais; eventos; Supabase Realtime; posição atômica; idempotência; RLS; UI mobile-first.

## ADRs
001 Banco compartilhado+RLS · 002 RPCs para transições · 003 Sem checkout · 004 Guest com e-mail confirmado · 005 Sessão 30min · 006 Platform Admin independente · 007 Fila virtual separada · 008 Notificações via Resend.

## Próximos passos
1 Baseline: git pull · npm ci · release:check. 2 Banco: confirmar 001–031. 3 Fila virtual: discovery (10 decisões). 4 Design: 2 direções em docs/design-preview/. 5 LGPD: ler PRIVACY_BACKLOG.md.

## Variáveis
Web: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL, UI_FORCE_LEGACY.
Edge Function: RESEND_API_KEY, EMAIL_FROM, APP_BASE_URL.
Vault: barbershop_project_url, barbershop_service_role_key.

## Pontos de atenção
Banco real pode divergir das migrations · fila de e-mail ≠ fila virtual · canceled_at isolado não distingue cancelamento de no-show · trial 15 dias · trabalhar na main, blocos agrupados.

## Prompt para próxima IA
Continue o projeto verificando estado atual do repo e banco antes de alterar. Não invente comportamento. Fila virtual é objetivo central, mas feche regras antes de migration. Mantenha RLS, autorização por tenant, transações, eventos, idempotência, testes. Trabalhe direto na main; só declare testes verdes quando executar o gate no código atual.
