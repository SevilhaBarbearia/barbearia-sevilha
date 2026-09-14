# Banco e automações

## Ordem de aplicação

Faça backup do banco existente e valide a atualização em um ambiente de teste antes de aplicá-la à operação da barbearia.

- Banco novo: execute todos os arquivos de `supabase/migrations/001_schema.sql` até `021_report_totals.sql`, em ordem numérica.
- Banco da versão anterior já atualizado até `008_acesso_administrativo.sql`: execute somente `009` a `021`.
- Este pacote substitui o trabalho intermediário não publicado. Se você chegou a aplicar alguma versão intermediária das migrations `009` em diante, compare o SQL executado antes de continuar; não reexecute migrations alteradas sobre tabelas existentes.

A `009` migra catálogos, horários, reservas e clientes anteriores para a Sevilha. A `015` substitui relações duplicadas por chaves compostas e restringe gravações diretas. As seguintes fecham disponibilidade, fila, cadastro, bloqueios locais e agregações.

O SQL completo está nos próprios arquivos. Para um projeto com histórico de migrations já gerenciado pela CLI:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase migration list
supabase db push --dry-run
supabase db push
```

Se `001`–`008` foram aplicadas manualmente pelo SQL Editor, a CLI pode não conhecer esse histórico. Nesse caso, execute os arquivos novos pelo SQL Editor, na ordem, ou reconcilie o histórico apenas depois de conferir quais migrations realmente foram aplicadas. Não marque migrations como concluídas para contornar erros.

`supabase/seed.sql` é opcional e destinado somente a desenvolvimento. Não use reset ou seed em produção.

## Resend e segredos

Valide o domínio remetente no Resend. Cadastre os secrets `RESEND_API_KEY`, `EMAIL_FROM` e `APP_BASE_URL` no painel de Edge Functions do Supabase. `APP_BASE_URL` deve ser a origem HTTPS pública, sem caminho de unidade e sem barra final.

Alternativa pela CLI: crie localmente `.env.edge` (ignorado pelo Git):

```env
RESEND_API_KEY=CHAVE_REAL_DO_RESEND
EMAIL_FROM=Agenda <agenda@seudominio.com.br>
APP_BASE_URL=https://seu-dominio.com.br
```

```bash
supabase secrets set --env-file .env.edge
supabase functions deploy process-notifications
```

Não entregue `.env.edge`, não faça commit e não use prefixo `NEXT_PUBLIC_` para esses segredos. A função usa `SUPABASE_URL` e a chave legada `SUPABASE_SERVICE_ROLE_KEY` fornecidas pelo ambiente Supabase. A API administrativa da função exige essa chave e mantém `verify_jwt = true`.

## Agendamento automático

No Supabase Vault, cadastre:

- `barbershop_project_url`: `https://SEU_PROJECT_REF.supabase.co`
- `barbershop_service_role_key`: a chave legada `service_role` do mesmo projeto, armazenada apenas no servidor.

Depois execute no SQL Editor o arquivo completo `supabase/setup/notifications_cron.sql`. Ele configura uma execução a cada cinco minutos. O job encontra aniversariantes pela data local de cada unidade e coloca os e-mails no horário configurado. A frequência também processa as pesquisas e novas tentativas.

Para desativar:

```sql
select cron.unschedule('process-barbershop-notifications');
```

A ativação do cron pode enviar mensagens aos clientes elegíveis. Faça a configuração inicial em ambiente de teste, com destinatários que você controla. Este pacote não ativou nenhum envio no seu projeto.

## Funcionamento da fila

A reserva concluída cria a pesquisa e o crédito de fidelidade em transação. A tabela de pesquisa guarda somente o hash do token. O token original permanece temporariamente no payload privado da fila para montar o link e é removido quando o envio é confirmado ou cancelado por falta de consentimento.

Cada processamento reclama até dez mensagens usando `FOR UPDATE SKIP LOCKED`. As tentativas usam a mesma chave de idempotência no Resend. Há no máximo cinco tentativas, com intervalo de cinco minutos e janela de 23 horas desde a primeira tentativa; processamento abandonado pode ser recuperado após dez minutos. Isso mantém as tentativas dentro da janela de 24 horas de idempotência do [Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

Mensagens esgotadas permanecem como falha para investigação. Não reative manualmente uma mensagem fora da janela de idempotência sem verificar no provedor se já foi enviada. O painel do Resend e os logs da função devem ser usados para investigar rejeições e erros de configuração.

A revogação de consentimento cancela mensagens ainda na fila na próxima reclamação. Um e-mail já aceito pelo provedor não pode ser recolhido. Aniversários de 29/02 são enviados somente nessa data, em anos bissextos.
