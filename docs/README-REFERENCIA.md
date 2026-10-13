# README de referência

## Visão
SaaS multi-tenant de barbearias. Página pública por slug, catálogo, agenda, reservas, área do cliente, painel admin, fidelidade, notificações, feedback, Platform Admin. Fila virtual pendente.

## Estado
Repo: github.com/SevilhaBarbearia/barbearia-sevilha · Branch main · Produção barbearia-app-agenda-six.vercel.app.

## Stack
Node ≥22.18 · Next 16.3.4 · React 19.3 · TS 5.9.3 · Tailwind 4.3.3 · Supabase SSR/JS · Postgres · Vercel · Resend · PGlite · Playwright.

## Estrutura
src/app/{[slug],admin,plataforma,api,auth} · src/components/{admin,agendamento,brand,forms,layout,platform,ui} · src/features/{appointments,availability,customers,feedback,loyalty,platform,settings,storage,tenancy} · src/lib/{actions,admin,agendamentos,auth,db,supabase,theme} · supabase/{migrations,functions,setup,verification} · tests · docs.

## Local
npm ci · cp .env.example .env.local · npm run dev.

## Env web
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL, UI_FORCE_LEGACY=false.

## Env Edge Function
RESEND_API_KEY, EMAIL_FROM, APP_BASE_URL.

## Vault (cron)
barbershop_project_url, barbershop_service_role_key.

## Scripts
dev, build, start, typecheck, test, test:admin, test:ownership, test:release, test:rollout, test:platform, validate, release:check, smoke:prod, format:check, test:db.
Gate: npm run release:check.

## Migrations
supabase/migrations/ até 031. Destaques: 028 no-show, 029 platform admin, 030 fix guest booking takeover, 031 exige e-mail confirmado no claim. Rollbacks em supabase/rollbacks/ (não são migrations).

## Auth
Cliente: Google. Guest: nome+telefone, e-mail opcional. Vínculo por e-mail confirmado. Admin: e-mail/senha. Platform Admin: /plataforma/login.

## Reserva e pagamento
Estados pending/confirmed/completed/canceled/no_show. Ativos: pending+confirmed. Pagamento presencial; faturamento só paid.

## E2E
npx playwright test — baseline mobile (Pixel 5) + desktop. Screenshots em tests/e2e/__screenshots__/ (ignorado no git).

## Publicação
1 Git limpo · 2 release:check · 3 migrations · 4 deploy · 5 canary · 6 smoke · 7 validação manual.

## Backlog
1 Fila virtual · 2 LGPD retenção · 3 Design system · 4 Docs de migrations.
