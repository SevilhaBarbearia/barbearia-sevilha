# Acesso administrativo

Clientes entram com Google em `/{slug}/login`. Proprietários e gestores usam e-mail e senha em `/admin/login`. Uma sessão Google não concede poderes administrativos.

## Primeiro administrador da plataforma

Crie sua conta com e-mail e senha em Supabase Authentication > Users. Copie o UUID dessa conta e execute no SQL Editor:

```sql
update public.profiles
set role = 'admin', is_platform_admin = true, is_active = true, updated_at = now()
where id = 'UUID_DA_SUA_CONTA'::uuid;
```

Confirme que exatamente a conta desejada foi atualizada. A promoção administrativa nunca é feita pelo formulário público.

## Sevilha existente

A migration `009` associa os perfis administrativos ativos anteriores à Sevilha. O primeiro Platform Admin precisa ser promovido separadamente pelo SQL acima.

## Nova barbearia e unidades

1. Crie a conta do proprietário com e-mail e senha em Supabase Auth.
2. Entre em `/plataforma` com sua conta administrativa.
3. Preencha nome, slug e o e-mail cadastrado no Auth.
4. Escolha “Nova organização” para uma nova empresa ou a organização existente para outra unidade do mesmo dono.
5. Entregue `/{slug}` e `/admin/{slug}`.

A criação é transacional. Inclui unidade, associação do proprietário, configurações, plano de teste, fidelidade e modelos de mensagem. Uma organização existente só pode receber unidade com o mesmo proprietário.

O proprietário configura catálogo, imagens, expediente, regras e mensagens em seu painel. A seleção `/admin/selecionar` mostra as unidades permitidas. O cadastro por conta própria, convites por e-mail e cobrança recorrente não fazem parte desta versão.
