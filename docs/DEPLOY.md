# Publicação

## 1. Ambiente

Na Vercel use Node.js 22 ou superior.

Variáveis da aplicação web:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=https://SEU_DOMINIO.com.br
```

Opcional, apenas para rollback visual emergencial:

```env
UI_FORCE_LEGACY=false
```

A aplicação não precisa de Edge Config/Global Config para escolher a interface.

## 2. Banco

Aplique as migrations em ordem até:

```text
026_customer_appointment_ownership.sql
```

Depois execute, somente para conferência:

```text
supabase/verification/release_readiness.sql
```

O arquivo de verificação é somente leitura.

## 3. Google

Habilite Google no Supabase Auth.

Configure:

```text
https://SEU_DOMINIO.com.br/auth/callback
```

Para desenvolvimento permita também:

```text
http://localhost:3000/auth/callback
```

A reserva sem conta continua disponível mesmo quando Google estiver
desabilitado.

## 4. Sessão

A aplicação encerra a sessão local depois de **30 minutos sem atividade
humana**.

Clique, toque, teclado e scroll renovam o período. Renovação automática do JWT
não conta como atividade.

Essa regra está em:

```text
src/lib/auth/auth-provider.tsx
```

## 5. Validação antes do push

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run validate
```

## 6. Pós-deploy

```powershell
$env:SITE_URL="https://SEU-DOMINIO"
$env:TENANT_SLUG="sevilha"

npm run smoke:prod
```

## 7. E-mail

As chaves de Resend/service role permanecem no Supabase/Edge Function, nunca
no navegador.

## 8. Segundo tenant

Siga:

```text
docs/SECOND_TENANT_CANARY.md
```

Somente depois desse canary o produto principal deve ser considerado pronto
para escalar para novos clientes.
