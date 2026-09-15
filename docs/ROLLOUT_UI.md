# Rollout da interface Warm Premium

A interface **Warm Premium é o padrão do produto**, mas o rollback volta a ser
controlado individualmente por tenant.

O projeto não depende de Global Config, Edge Config, branch específica ou
serviço externo para decidir qual interface deve ser exibida.

## Fonte de verdade

Cada barbearia possui a coluna:

```text
barbershops.ui_version
```

Valores permitidos:

```text
warm-premium
legacy
```

A migration `027_audit_fixes_rollout_and_sessions.sql` mantém os tenants atuais
em `warm-premium` e deixa o mesmo valor como padrão para novos tenants.

## Rollback individual

Se apenas uma barbearia apresentar problema visual após entrar em produção,
ela pode voltar para a interface legada sem afetar as demais.

Exemplo:

```sql
update public.barbershops
set ui_version = 'legacy'
where slug = 'tenant-com-problema';
```

Para devolver somente esse tenant ao Warm Premium:

```sql
update public.barbershops
set ui_version = 'warm-premium'
where slug = 'tenant-com-problema';
```

A mudança é lida do banco por tenant e não exige alterar Sevilha,
ExclusiveMen ou qualquer outro cliente.

## Rollback global de emergência

A variável abaixo continua existindo somente como freio de emergência global:

```env
UI_FORCE_LEGACY=true
```

Quando ela está ativa, todos os tenants usam `legacy`, independentemente do
valor individual salvo no banco.

No uso normal:

```env
UI_FORCE_LEGACY=false
```

ou simplesmente não configure a variável.

## Ordem de decisão

```text
UI_FORCE_LEGACY=true
        ↓
legacy para todos

UI_FORCE_LEGACY ausente/false
        ↓
barbershops.ui_version
        ↓
legacy OU warm-premium somente para aquele tenant
```

## Canary e validação obrigatória

Antes de aprovar um terceiro tenant, execute localmente:

```powershell
npm run test:rollout
npm run validate
```

Depois de aplicar a migration no banco real, execute também:

```text
supabase/verification/tenant_ui_rollback.sql
```

Esse teste usa uma transação e termina com `ROLLBACK`. Ele altera
temporariamente somente a ExclusiveMen, confirma que a Sevilha não mudou e
restaura automaticamente o estado original.

Depois do deploy, rode o smoke para cada tenant que faz parte do canary.

## Regra

Nunca use o nome Sevilha como identidade fixa em regras de negócio. O slug
`sevilha` aparece no arquivo de verificação apenas porque hoje ele faz parte do
canary real. Consultas de negócio continuam limitadas pelo `barbershop_id`.
