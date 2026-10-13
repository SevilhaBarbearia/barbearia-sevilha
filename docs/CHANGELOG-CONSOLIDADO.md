# Changelog consolidado

## [0.8.0] — Segurança: guest booking + claim (2026-10-13)
### Corrigido
- 030 `030_fix_guest_booking_takeover.sql`: cliente existente encontrado por telefone não tem full_name nem email sobrescritos a partir de input anônimo. GUEST_ACTIVE_LIMIT → SLOT_UNAVAILABLE (genérica). Views legado appointment_busy_slots/blocked_busy_slots revogadas de anon e public.
- 031 `031_endurecer_claim_identity.sql`: claim_my_guest_appointments e is_customer_identity_owner passam a exigir auth.users.email_confirmed_at is not null.
### Alterado
- Fixture auth.users ganha email_confirmed_at timestamptz default now() em tests/database.test.mjs e tests/customer-ownership.test.mjs.
- Rollback do 030 em supabase/rollbacks/.
### Testes
npm test → 52/52.

## [0.7.0] — Login independente Platform Admin (2026-10-11)
### Adicionado
- /plataforma/login + PlatformLoginForm + entrarPlatformAdmin/sairPlatformAdmin.
- platform-policy.ts (permitePlataforma) e platform-permissoes.ts (obterPlatformAdminAtual) sem exigir role='admin'.
- platform-admin-login.test.mjs.
### Corrigido
- /plataforma deixa de redirecionar para /admin/login.

## [0.6.0] — Fundação Platform Admin (2026-09-18)
029_platform_admin_foundation.sql · platform-security.test.mjs · platform_foundation_readiness.sql · PRIVACY_BACKLOG.md.
Git: 2316c267d30c94bc6d852d02e1ce4ff83a9d9ca0.

## [0.5.0] — Auditoria, sessões e no-show (2026-09-15)
027_audit_fixes_rollout_and_sessions.sql (sessão 30min) · 028_structured_no_show.sql (no-show + cancelamento).
Git: fe505ec · bc303f6 · 4c8aebd.

## [0.4.0] — Propriedade de reservas guest (026)
is_customer_identity_owner, is_appointment_identity_owner, claim_my_guest_appointments. Telefone não verificado não reivindica.

## [0.3.0] — Hardening e disponibilidade (014-025)
Agendamento, disponibilidade, integridade, permissões, bloqueios, totais, conclusão atômica, grade 15/30/45/60.

## [0.2.0] — Multi-tenant + recursos (009-013, 016-021)
SaaS, branding, RLS, fidelidade, notificações, feedback, storage, auditoria, rate limit.

## [0.1.0] — Escopo inicial (2026-07)
Página pública, login Google, perfil, reservas, agenda, painel, pagamento presencial, faturamento, RLS. Sem checkout online.

## [Unreleased]
Fila virtual · LGPD · Rate limit booking (032) e expiração pending guest (033) em modo sombra · Design tokens + direção visual.
