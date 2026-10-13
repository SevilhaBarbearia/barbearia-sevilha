# System Design — Sevilha SaaS
**Data:** 13/10/2026

## Stack
Next 16.3.4 · React 19.3 · TS 5.9.3 · Tailwind 4.3.3 · Supabase (Auth+Postgres+Edge Functions+Vault) · Vercel · Resend · PGlite · Playwright · Node ≥22.18.

## Componentes
Frontend: App Router por slug; src/{components,features,lib}.
Backend: Supabase Auth, server actions, RPCs SECURITY DEFINER.
Banco: RLS, appointment_events, migrations SQL, PGlite nos testes.
Infra: Vercel, Supabase, Resend.

## Domínios
Tenancy · Catálogo · Disponibilidade · Agendamento · Clientes · Pagamento presencial · Fidelidade · Notificações · Feedback · Platform Admin · Fila virtual (futuro).

## Multi-tenant
Banco compartilhado; barbershop_id como identidade; RLS como barreira persistente; validação server-side.
Regras: nunca confiar em barbershop_id do browser · cliente só acessa o próprio · admin/manager só onde tem membership · barbeiro só o vinculado · RLS/RPCs/lote seguem a mesma regra · Platform Admin não é owner/manager automaticamente · suporte temporário/escopado/auditado.

## Auth
Cliente: Google + guest (nome+telefone, e-mail opcional). Vínculo guest→conta: e-mail autenticado == e-mail informado E confirmado no Auth (migration 031). Admin de tenant: e-mail/senha + membership. Platform Admin: /plataforma/login com guard obterPlatformAdminAtual (não exige role='admin').

## Agendamento
Estados pending/confirmed/completed/canceled/no_show. Ativos: pending+confirmed. Constraints exclude using gist no barbeiro (001) e no cliente (022). RPCs com FOR UPDATE. No-show só após start_at.

## Fila virtual (proposta)
Ciclo separado do agendamento. Tabelas próprias (queue_entries, queue_events). RPCs transacionais, eventos, realtime como notificação (banco é fonte).

## Notificações
Edge Function process-notifications; fila de e-mail; Resend; lotes de 10; FOR UPDATE SKIP LOCKED; idempotência; 5 tentativas; janela 23h. Não é fila virtual.

## Pagamentos
Presencial apenas. Faturamento considera só paid.

## UI
Mobile-first; Manrope; ivory/white/charcoal + bronze; fallback por tenant; sem PII pública na fila.

## Segurança
Service-role só no servidor; RLS; validação server-side; access token 1800s; inatividade 30min; auditoria; LGPD backlog.

## ADRs
001 Supabase/Postgres · 002 Banco compartilhado+RLS · 003 RPCs para transições · 004 Pagamento presencial · 005 Fila virtual separada · 006 Platform Admin independente · 007 Sessão 30min · 008 Notificações via Resend · 009 ui_version por tenant.
