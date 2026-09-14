# Publicação

## Preparação

Aplique o SQL e configure as contas conforme os demais guias. Configure no projeto Vercel Node.js 22 ou superior e as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=https://SEU_DOMINIO.com.br
```

Use `npm ci` para instalar e `npm run build` para construir. O diretório raiz é a pasta que contém `package.json`. Se conectar a um repositório Git, publique os arquivos dessa pasta; não envie `node_modules`, `.next` nem arquivos de segredos.

## Autenticação

Habilite Google para clientes no Supabase Auth. Configure a URL do site e permita o callback da aplicação:

```text
https://SEU_DOMINIO.com.br/auth/callback
```

Na configuração OAuth do Google, use também o callback do Supabase indicado pelo painel do provedor. São dois callbacks com funções diferentes.

Para desenvolvimento, permita `http://localhost:3000/auth/callback` no Supabase.

## E-mail

Publique a Edge Function e ative o cron seguindo `MIGRACAO_SAAS.md`. As chaves de Resend e service role ficam no Supabase, nunca no navegador. A aplicação web não depende da chave de serviço.

## Conferência no ambiente configurado

Faça um fluxo real com conta de teste: login, cadastro, reserva, cancelamento, nova reserva, conclusão, crédito de pontos, resgate e pesquisa. Confirme recebimento do e-mail no destinatário de teste. Confira o painel com dois proprietários e duas unidades diferentes.

Essas verificações externas dependem das suas credenciais e não foram executadas nesta entrega. Avalie os planos e termos dos provedores ao publicar comercialmente; este projeto não contrata nenhum serviço.
