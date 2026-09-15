# Rollout da interface Warm Premium

A interface **Warm Premium é o padrão do produto**.

O projeto não depende mais de Global Config, Edge Config, branch específica ou
lista externa de tenants para decidir qual interface deve ser exibida. Essa
simplificação reduz o risco operacional e evita que um alias antigo da Vercel
aponte para uma versão visual diferente.

## Comportamento normal

Sem configuração adicional:

```text
tenant → Warm Premium
```

Cada tenant continua recebendo seus próprios dados, logo, imagens e cores a
partir do `barbershop_id` e do slug correspondente.

## Rollback emergencial

Existe somente uma chave de emergência no servidor:

```env
UI_FORCE_LEGACY=true
```

Use essa variável apenas se for necessário voltar temporariamente para a
interface antiga. Depois de alterar a variável é necessário um novo deploy.

No uso normal:

```env
UI_FORCE_LEGACY=false
```

ou simplesmente não configure a variável.

## Canary

A Sevilha é o tenant piloto principal.

Antes de cadastrar uma segunda barbearia real, execute:

```powershell
npm run validate
```

Depois do deploy:

```powershell
$env:SITE_URL="https://SEU-DOMINIO"
$env:TENANT_SLUG="sevilha"
npm run smoke:prod
```

O segundo tenant deve ser validado conforme `SECOND_TENANT_CANARY.md`.

## Regra

Nunca use o nome Sevilha como identidade fixa em regras de negócio. O slug
`sevilha` pode ser usado apenas como dado do tenant piloto. Toda consulta de
negócio deve continuar limitada pelo `barbershop_id`.
