# Sprint: Onboarding seguro de tenant + dono

**Status:** planejado · **Pré-requisito:** coleta concluída (`_coleta-onboarding-*.txt`)

## Objetivo

Substituir o fluxo manual atual (criar conta no Supabase Auth + criar tenant via `/plataforma`) por um fluxo **integrado e seguro** dentro do próprio painel da plataforma, sem nunca o Platform Admin conhecer ou definir a senha do dono.

## Problemas do fluxo proposto na auditoria (corrigidos neste plano)

1. **Sem autorização.** Rota que cria usuário/tenant sem validar sessão. Qualquer um que descubra a URL cria contas.
2. **Senha temporária em texto no e-mail**, gerada com `Math.random` (previsível). Fica guardada na caixa de entrada.
3. **`force_password_change` em `user_metadata`** não é barreira — o próprio usuário altera.
4. **Admin conhece a senha do cliente.** Suporte nunca deve saber senha.
5. **`email_confirm: true` sem prova de posse.** Se o admin digitar errado, marca como verificado.
6. **Operação não atômica.** Usuário órfão se o insert do tenant falhar.

## Fluxo revisado (a implementar)

1. Admin com sessão por senha acessa `/plataforma`. Preenche: **nome, slug, e-mail do dono**.
2. Servidor valida sessão via `requirePlatformAdmin()` (já existe), valida slug (lista de palavras reservadas), aplica **rate limit** e **idempotência**.
3. **Cria o tenant numa transação** usando `create_barbershop_with_owner` (029) — não recriar lógica.
4. **Convida o dono** com `auth.admin.inviteUserByEmail` (ou `generateLink({ type: 'invite' })`). Se o e-mail já existir, apenas cria o vínculo e avisa.
5. **Envio via fila** (`outbound_notifications`) com retry. Nunca dentro da rota HTTP.
6. Dono **define a própria senha** pelo link de convite. Não existe senha temporária.
7. **Recuperação**: admin dispara `generateLink({ type: 'recovery' })`, link vai só para o e-mail do dono.

## Decisões de arquitetura

- **Sem `user_metadata` para controle.** Se precisar de estado, usar `app_metadata` (só service role escreve).
- **Dono é vínculo**, nunca campo. `barbershop_members.role = 'owner'`.
- **Estados comerciais** alinhados com `subscriptions.status`: `trial`, `active`, `past_due`, `suspended`, `canceled`, `expired`. Arquivamento de tenant = `barbershops.archived_at` (tombstone).
- **Slug público** (`/{slug}`) exige validação de colisão com rotas reservadas: `admin, api, auth, plataforma, avaliar, login, reservar, cliente, completar-cadastro`.
- **Convite primeiro, tenant depois** ou **tenant primeiro, convite depois?** → **tenant primeiro** (transação garantida), **convite depois** (falha no convite = apenas reenviar, sem recriar nada).
- **Feature flag** para rodar o novo fluxo em paralelo ao manual até validar. Nada em produção quebra.

## Pendências antes de codar

1. **Provider de e-mail do Supabase Auth.** Se está no relay padrão (limite baixo, cai em spam), o convite pode não chegar. Confirmar SMTP próprio ou aceitar limitação.
2. **Mesmo e-mail pode ser dono de duas barbearias?** Hoje `barbershop_members` tem `unique(barbershop_id, profile_id)`, ou seja, **sim** — o mesmo profile pode ter membership em vários tenants. Manter.
3. **RPC nova ou alteração da 029.** O fluxo atual exige que a conta do dono já exista. Com convite, a ordem inversa exige uma **nova RPC** `platform_create_tenant_and_invite(...)`. Proposta a validar antes de codar.
4. **Fila de e-mail.** `outbound_notifications` já tem `idempotency_key` e status. Adicionar tipo `owner_invite` e `owner_recovery`.

## LGPD — correções ao documento original

- **Papéis**: barbearia = controladora dos dados dos clientes finais; plataforma = operadora. Para dados do dono e da plataforma, plataforma = controladora. Exige DPA com cada barbearia.
- **Base legal**: obrigação de guarda é art. 16, **inciso I**, não II. Confirmar com advogado.
- **Anonimização (art. 12)**: só se irreversível. "Barbeiro: Anonimizado" + data + valor + nome da barbearia identifica em barbearia pequena. Preferir **agregados mensais** com número mínimo de registros.
- **Acesso e portabilidade (art. 18)** antes de expurgo: exportação CSV/JSON do tenant.
- **Carência e aviso**: dois avisos, 30 dias de carência, registro de quem aprovou, **legal hold** para disputa em aberto.
- **Backups**: política precisa informar prazo de retenção do backup do Supabase.
- **Documentos**: política de privacidade + termos de uso são bloqueadores para vender para terceiros.

## Critérios de aceite

- [ ] Rota nova valida `requirePlatformAdmin` antes de qualquer coisa.
- [ ] Nenhuma senha em texto no banco, e-mail ou logs.
- [ ] `force_password_change` em `user_metadata` eliminado.
- [ ] Convite com `inviteUserByEmail`, sem senha temporária.
- [ ] Operação atômica: se convite falha, apenas reenvia — sem usuário órfão.
- [ ] Fila de e-mail com retry, não envio síncrono.
- [ ] Slug colide com rotas reservadas → erro claro.
- [ ] Feature flag para rodar em paralelo ao fluxo manual.
- [ ] Auditoria em `platform_audit_logs` para cada operação.
