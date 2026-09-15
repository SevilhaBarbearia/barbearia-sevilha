# Canary do segundo tenant

Este roteiro conclui a validação multi-tenant antes de comercializar o SaaS em
escala.

## Objetivo

Comprovar no ambiente real:

```text
Admin A → somente Barbearia A
Admin B → somente Barbearia B

Cliente A → somente dados permitidos da Barbearia A
Cliente B → somente dados permitidos da Barbearia B
```

O administrador da plataforma é a única exceção planejada. O painel Platform
será desenvolvido depois da conclusão destes steps.

## Antes do canary

Execute:

```powershell
npm run validate
```

No Supabase SQL Editor execute o arquivo de leitura:

```text
supabase/verification/release_readiness.sql
```

Todos os checks booleanos devem retornar `true` e todos os campos
`violations` devem retornar `0`.

## Criar o segundo tenant

Quando houver uma segunda conta administrativa pronta no Supabase Auth, a base
já possui a função transacional de criação de tenant usada pelos testes:

```sql
select public.create_barbershop_with_owner(
  'Barbearia Piloto 2',
  'piloto-2',
  'email-do-dono@exemplo.com'
);
```

Use um slug temporário diferente do tenant real de produção caso esteja apenas
testando.

Não compartilhe a mesma conta administrativa entre as duas barbearias para
este teste. O objetivo é provar o isolamento.

## Testes obrigatórios

1. Entre como Admin A e abra `/admin/barbearia-a`.
2. Troque manualmente a URL para `/admin/barbearia-b`.
3. Confirme que nenhum dado da Barbearia B é exibido.
4. Repita o teste invertendo as contas.
5. Na página pública do tenant B confirme nome, logo, serviços, barbeiros,
   horários e cores próprios.
6. Crie uma reserva no tenant B.
7. Confirme que ela não aparece na agenda/reservas do tenant A.
8. Conclua o atendimento no tenant B e registre pagamento.
9. Confirme que faturamento e forma de pagamento aparecem somente no tenant B.
10. Faça uma reserva guest com e-mail e depois entre com a conta desse mesmo
    cliente. Confirme que o horário aparece em "Meus agendamentos".
11. Teste logout por 30 minutos de inatividade.
12. Navegue entre páginas públicas, cliente e admin e confirme o loading com
    tesoura.

## Smoke HTTP

Após cada deploy relevante:

```powershell
$env:SITE_URL="https://SEU-DOMINIO"
$env:TENANT_SLUG="piloto-2"

npm run smoke:prod
```

## Aprovação

O canary é aprovado somente se:

- `npm run validate` passar;
- `release_readiness.sql` não indicar violações;
- o smoke HTTP passar;
- nenhum admin acessar dados do outro tenant;
- reservas, pagamentos e indicadores permanecerem separados;
- cliente autenticado visualizar suas próprias reservas.

Depois disso o produto principal está pronto para o início do trabalho do
**Platform Admin**.
