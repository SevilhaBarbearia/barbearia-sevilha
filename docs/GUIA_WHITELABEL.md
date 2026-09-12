# Guia de whitelabel (cor de marca por tenant)

Esta etapa cria a base técnica para cada barbearia (tenant) ter sua própria cor de marca, sem precisar de um build separado por cliente. É pré-requisito para o modo SaaS multi-tenant do roadmap.

## Por que isso era necessário

A cor de marca (`brand-50` até `brand-950`) é definida em `src/app/globals.css`, dentro do bloco `@theme` do Tailwind v4. O Tailwind já compila as classes utilitárias (`bg-brand-500`, `text-brand-100` etc.) para lerem essas variáveis CSS em vez de embutir o valor hexadecimal fixo em cada classe. Isso significa que, para trocar a cor de marca, basta sobrescrever essas variáveis em runtime — nenhum componente precisa mudar.

(O arquivo `tailwind.config.ts` também tem um bloco `colors.brand`, mas ele não é usado: o projeto não tem a diretiva `@config` no `globals.css`, então o Tailwind v4 lê a cor apenas do `@theme`. Esse bloco no config pode ser removido no futuro sem efeito nenhum.)

## O que foi adicionado

- Colunas `primary_color` e `primary_color_dark` em `business_settings` (migration `009_whitelabel_business_settings.sql`), ambas opcionais e validadas por formato hexadecimal (`#rrggbb`).
- `src/lib/theme/paleta-marca.ts`: gera a paleta completa de tons a partir da cor principal do tenant. Sem cor configurada, devolve exatamente a paleta padrão da Sevilha — nenhuma barbearia sem personalização nota diferença.
- `src/lib/theme/obter-paleta-tenant.ts`: busca as cores em `business_settings` e monta a paleta. Já comentado no ponto exato a ajustar quando o multi-tenant (com `tenant_id`) existir.
- `src/app/layout.tsx`: agora é `async`, busca a paleta do tenant e injeta um `<style>` no `<head>` sobrescrevendo as variáveis `--color-brand-*`.
- `src/lib/db/types.ts`: novo tipo `BusinessSettings`, incluindo os dois campos novos.

## Como testar

1. Rode a migration `009_whitelabel_business_settings.sql` no SQL Editor do Supabase (depois da `008`).
2. Sem configurar nada, confirme que o site continua idêntico (paleta padrão).
3. Rode manualmente no SQL Editor:

   ```sql
   update public.business_settings
   set primary_color = '#2563eb', primary_color_dark = '#1e3a8a'
   where true;
   ```

4. Recarregue o site — os tons dourados devem virar azuis em toda a aplicação (botões, badges, ícones, cards), sem precisar de novo deploy.
5. Para voltar ao padrão, defina as duas colunas como `null` novamente.

## O que falta (próximo passo)

Ainda não existe campo na tela `/admin/configuracoes` para o admin trocar essa cor pela interface — hoje só é possível via SQL direto, como no teste acima. Adicionar esses dois campos (com um seletor de cor) ao `ConfiguracoesForm` é o próximo passo natural, reaproveitando o `Input` já existente no projeto.
