# Validação final do produto principal

Este documento substitui números antigos de migrations/testes e define o gate
atual de release.

## Gate local

Antes de qualquer deploy:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run validate
```

`npm run validate` executa:

```text
TypeScript
→ testes Node/PGlite
→ build de produção do Next.js
```

A release só deve avançar se os três estágios terminarem sem erro.

## O que os testes cobrem

A suíte inclui:

- autorização administrativa por senha;
- isolamento entre administradores de tenants diferentes;
- criação transacional de tenant;
- referências cruzadas entre tenants recusadas;
- RLS e operações críticas via RPC;
- conflito de horários;
- conflito de horário do mesmo cliente;
- alinhamento da grade configurável;
- conclusão de atendimento;
- fidelidade;
- feedback;
- notificações;
- hardening de headers;
- reserva guest;
- vínculo da reserva guest à identidade autenticada correta;
- proteção contra reivindicação por outro e-mail;
- invariantes da release atual.

## Banco real

Depois de aplicar as migrations até `026_customer_appointment_ownership.sql`,
execute no SQL Editor:

```text
supabase/verification/release_readiness.sql
```

Esse arquivo não altera dados.

Os checks de funções/triggers devem retornar `true`.

Os seguintes campos devem retornar `0`:

```text
appointment_customer_tenant_mismatch
appointment_barber_tenant_mismatch
appointment_service_tenant_mismatch
payment_tenant_mismatch
```

## Pós-deploy

Configure:

```powershell
$env:SITE_URL="https://SEU-DOMINIO"
$env:TENANT_SLUG="sevilha"
```

e execute:

```powershell
npm run smoke:prod
```

O smoke confere rotas públicas, login administrativo e headers de segurança.
Ele não envia reservas, não efetua pagamentos e não altera o banco.

## Validação manual

No tenant piloto confirme:

- página pública responsiva;
- Google opcional;
- reserva com conta;
- reserva sem conta;
- "Meus agendamentos";
- histórico;
- cancelamento;
- agenda administrativa;
- conclusão + pagamento;
- dashboard;
- filtros de reservas;
- loading com tesoura;
- sessão expirada após 30 minutos sem atividade.

## Multi-tenant

A validação final de um segundo tenant está documentada em:

```text
docs/SECOND_TENANT_CANARY.md
```

## Limites

Os testes locais simulam Auth/JWT em PostgreSQL embarcado. Login Google real,
domínio, entrega real de e-mail e comportamento da Vercel precisam ser
confirmados no ambiente publicado.

O Platform Admin não faz parte desta etapa. Ele será construído depois que o
produto principal e o segundo tenant estiverem validados.
