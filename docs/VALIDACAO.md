# Validação final do produto principal

Este documento define o gate atual de release depois das correções da auditoria.

## Gate local

Antes de qualquer deploy:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run release:check
```

`release:check` executa primeiro o teste explícito de rollback individual e em
seguida o gate completo:

```text
rollback individual por tenant
→ TypeScript
→ testes Node/PGlite
→ build de produção do Next.js
```

A release só deve avançar se todos os estágios terminarem sem erro.

## O que os testes cobrem

A suíte inclui:

- rollback de um único tenant sem alterar os demais;
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
- sessão por inatividade validada no servidor;
- proteção contra heartbeat reativar sessão já expirada;
- invariantes da release atual.

## Banco real

Depois de aplicar as migrations até
`027_audit_fixes_rollout_and_sessions.sql`, execute no SQL Editor:

```text
supabase/verification/release_readiness.sql
```

Os checks de funções/triggers já existentes devem continuar válidos e os
contadores de referências cruzadas precisam permanecer em `0`.

Depois execute obrigatoriamente:

```text
supabase/verification/tenant_ui_rollback.sql
```

O resultado deve exibir um `NOTICE` iniciado por:

```text
PASS: ExclusiveMen mudou isoladamente
```

A transação termina com `ROLLBACK`, então o teste não deixa a ExclusiveMen em
Legacy.

## Sessão de 30 minutos

A aplicação agora mantém atividade por `session_id` no servidor. Refresh
automático de JWT não conta como atividade humana.

Como defesa adicional, configure no Supabase Auth o tempo de expiração do JWT
para **1800 segundos (30 minutos)**. Isso limita também a vida útil de um access
token já emitido; o controle de inatividade da aplicação continua sendo feito
pela migration e pelo servidor.

Depois da configuração, valide manualmente:

1. faça login e use normalmente a aplicação;
2. confirme que atividade humana mantém a sessão;
3. deixe a conta sem atividade por mais de 30 minutos;
4. tente abrir uma área protegida;
5. o servidor deve exigir novo login, mesmo que o front-end ainda não tenha
   executado seu timer local.

## Regra explícita de reserva guest

Reserva sem login continua aceitando nome + telefone e e-mail opcional.

Para uma reserva guest aparecer automaticamente em uma conta criada/logada
depois, o e-mail informado na reserva precisa ser o mesmo e-mail autenticado.
Reserva guest sem e-mail continua válida, mas não é vinculada automaticamente
somente por telefone, porque o telefone ainda não é uma identidade verificada.

## Pós-deploy

Antes do smoke, faça o canary real do rollback individual em produção. Use a
ExclusiveMen como tenant de teste e mantenha a Sevilha aberta em outra aba.

Ative Legacy somente na ExclusiveMen:

```sql
update public.barbershops
set ui_version = 'legacy'
where slug = 'exclusivemen';
```

Confirme visualmente:

```text
/sevilha       → continua Warm Premium
/exclusivemen  → entra em Legacy
```

Depois restaure imediatamente a ExclusiveMen:

```sql
update public.barbershops
set ui_version = 'warm-premium'
where slug = 'exclusivemen';
```

Confirme novamente que os dois tenants estão em Warm Premium. Esse teste é o
gate funcional do item 1; o teste PGlite e o SQL transacional validam a camada
de dados, mas este passo confirma que a aplicação publicada respeita a flag
individual.

Rode então o smoke pelo menos para os dois tenants reais atuais:

```powershell
$env:SITE_URL="https://SEU-DOMINIO"
$env:TENANT_SLUG="sevilha"
npm run smoke:prod

$env:TENANT_SLUG="exclusivemen"
npm run smoke:prod
```

O smoke não envia reservas, não efetua pagamentos e não altera o banco.

## Validação manual

Confirme:

- página pública responsiva;
- Sevilha continua em Warm Premium;
- ExclusiveMen continua em Warm Premium;
- rollback individual funciona sem afetar o outro tenant;
- Google opcional;
- reserva com conta;
- reserva sem conta;
- regra de e-mail da reserva guest está visível;
- "Meus agendamentos";
- histórico;
- cancelamento;
- agenda administrativa;
- conclusão + pagamento;
- dashboard;
- filtros de reservas;
- loading com tesoura;
- sessão recusada pelo servidor após 30 minutos sem atividade.

## Limites

Os testes locais simulam Auth/JWT em PostgreSQL embarcado. Login Google real,
domínio, entrega real de e-mail, cookies e comportamento da Vercel precisam ser
confirmados no ambiente publicado.

O Platform Admin só deve avançar depois deste gate e da feature No-show serem
validados.
