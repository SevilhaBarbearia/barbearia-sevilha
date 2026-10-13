# Changelog

Mudanças notáveis do projeto. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.9.0] — Sprint: onboarding seguro de tenant (planejado)

### Planejado
- Substituir fluxo manual (Auth + `/plataforma`) por fluxo integrado com convite.
- Convite via `inviteUserByEmail`, sem senha temporária.
- Feature flag para rodar em paralelo ao fluxo manual.
- Fila de e-mail com retry (`outbound_notifications`).
- Detalhes em `docs/SPRINT-ONBOARDING.md`.

### Pendente de decisão
- SMTP próprio do Supabase Auth (ou aceitar limitação do relay padrão).
- DPA com cada barbearia, política de privacidade e termos de uso.

## [0.8.0] — Plataforma: edição de tenant + upload de logo (2026-10-13)

### Adicionado
- `supabase/migrations/032_platform_admin_edit_tenant.sql` — RPC `platform_update_barbershop` e policy de storage para Platform Admin.
- `src/components/platform/EditTenantForm.tsx` — edição de nome, slug, e-mail de contato e logo.
- `src/components/platform/NewTenantModal.tsx` — modal com autofocus no campo inválido, mensagens em pt-BR, dropdown custom.
- `src/components/platform/PlatformShell.tsx` — shell dark no padrão admin.
- `src/components/platform/KpiCard.tsx` — card de métrica.
- `src/components/platform/TenantTable.tsx` — tabela densa com busca e filtro.

### Alterado
- `src/app/plataforma/page.tsx` — KPIs no topo + tabela + botão "Nova barbearia" no header.
- `src/app/plataforma/[slug]/page.tsx` — seções empilhadas em cards `#1B2939`.
- `src/app/plataforma/login/page.tsx` — card centralizado dark navy.
- `src/features/platform/actions.ts` — retorna estado em vez de redirecionar; mensagens em pt-BR.
- `src/features/platform/tenant-actions.ts` — adiciona `updateTenant`.
- `src/components/forms/PlatformLoginForm.tsx` — inputs dark, botão amber.

### Notas
- Upload de logo é processado no cliente: redimensiona mantendo proporção (até 512px), converte para WebP. Nunca estica, corta ou adiciona borda.
- E-mail de contato (`business_settings.email`) é **diferente** do e-mail de login (`auth.users.email`).

## [0.7.0] — Segurança: guest booking + claim (2026-10-13)

### Corrigido
- `030_fix_guest_booking_takeover.sql` — fecha account takeover em `book_guest_appointment`. Cliente existente encontrado por telefone **não tem** `full_name` nem `email` sobrescritos a partir de input anônimo. Mensagem `GUEST_ACTIVE_LIMIT` → `SLOT_UNAVAILABLE` (genérica, sem oráculo). Views legado `appointment_busy_slots`/`blocked_busy_slots` revogadas de `anon` e `public`.
- `031_endurecer_claim_identity.sql` — `claim_my_guest_appointments` e `is_customer_identity_owner` exigem `auth.users.email_confirmed_at is not null`.

### Alterado
- Fixture `auth.users` em `tests/database.test.mjs` e `tests/customer-ownership.test.mjs` ganha coluna `email_confirmed_at timestamptz default now()`.
- Rollback do 030 em `supabase/rollbacks/`.

### Testes
- `npm test` → 52/52.

## [0.6.0] — Login independente do Platform Admin (2026-10-11)

### Adicionado
- `/plataforma/login` + `PlatformLoginForm` + actions `entrarPlatformAdmin`/`sairPlatformAdmin`.
- `platform-policy.ts` (`permitePlataforma`) e `platform-permissoes.ts` (`obterPlatformAdminAtual`) — **sem exigir `role='admin'`**.
- `platform-admin-login.test.mjs`.

### Corrigido
- `/plataforma` deixa de redirecionar para `/admin/login`.

### Git
- Commit `4a1330b` e seguintes.

## [0.5.0] — Fundação do Platform Admin (2026-09-18)

### Adicionado
- Migration `029_platform_admin_foundation.sql` — features, plan features, overrides por tenant, auditoria, sessão de suporte, trial de 15 dias.
- Testes `platform-security.test.mjs`.
- Verificação `platform_foundation_readiness.sql`.
- `docs/PRIVACY_BACKLOG.md`.

### Git
- Commit `2316c267d30c94bc6d852d02e1ce4ff83a9d9ca0`.

## [0.4.0] — Auditoria, sessões e no-show (2026-09-15)

### Adicionado
- `027_audit_fixes_rollout_and_sessions.sql` — sessão por inatividade de 30 min.
- `028_structured_no_show.sql` — no-show estruturado, RPCs separadas para cancelamento administrativo e marcação de ausência.

### Corrigido
- No-show só em `pending`/`confirmed`, nunca antes do início.

### Git
- `fe505ec541fd642b7b149279f8b506b8d119c405`
- `bc303f6b45ef5a9d8e4455ab7505194850cf24c0`
- `4c8aebd130f288467ccd5a0e952a80bd65c59c87`

## [0.3.0] — Propriedade de reservas guest (migration 026)

### Adicionado
- `is_customer_identity_owner`, `is_appointment_identity_owner`, `claim_my_guest_appointments`.

### Segurança
- Telefone não verificado não reivindica reserva.

## [0.2.0] — Hardening e disponibilidade (014–025)

Funções de agendamento, disponibilidade, integridade, permissões, bloqueios, totais, conclusão atômica, hardening de grade 15/30/45/60.

## [0.1.0] — Multi-tenant + recursos (009–013, 016–021)

SaaS multi-tenant, marca por unidade, RLS, fidelidade, notificações, feedback, storage, auditoria, rate limit.

## [0.0.x] — Escopo inicial (2026-07)

Página pública, login Google, perfil, reservas, agenda, painel, pagamento presencial, faturamento, RLS. **Sem checkout online.**

## Política de atualização

Cada bloco registra:
- Migrations/arquivos afetados.
- Comportamento adicionado/alterado/corrigido.
- Testes executados e resultado.
- Riscos ou etapas operacionais.
