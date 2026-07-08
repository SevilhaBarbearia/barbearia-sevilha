# Guia de Responsividade e Densidade Visual

Esta atualização ajusta apenas camadas visuais do projeto. Nenhuma migration, tabela, policy RLS, action de reserva, CRUD administrativo ou regra de negócio foi alterada.

## Objetivo

Deixar a interface mais confortável em telas pequenas e médias, evitando cards, títulos e botões grandes demais no celular, sem perder o visual premium de barbearia.

## O que foi ajustado

- Componentes base `Button`, `ButtonLink`, `Card`, `Input`, `Textarea`, `Badge` e `Logo` agora usam tamanhos menores por padrão e aumentam progressivamente em telas maiores.
- Títulos principais foram reduzidos no mobile e em telas médias.
- Cards da home, serviços, barbeiros, dashboard e formulários receberam menos padding no mobile.
- Imagens dos cards de serviços e barbeiros foram reduzidas em telas pequenas.
- Sidebar administrativa ficou mais compacta em telas médias.
- Grade de horários disponíveis agora usa 2 colunas em telas muito pequenas, 3 colunas a partir de 420px e 4 colunas em telas maiores.
- Inputs e áreas de texto ficaram menos altos em mobile.

## Onde manter futuramente

Os principais pontos de manutenção visual estão em:

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/brand/Logo.tsx`
- `src/components/agendamento/SeletorHorario.tsx`
- `src/components/layout/AdminSidebar.tsx`
- `src/app/page.tsx`

## Regra usada

O padrão adotado foi:

- Mobile: mais compacto.
- Tablet: intermediário.
- Desktop: visual premium com mais respiro, mas sem exagerar.

Exemplo:

```tsx
className="text-2xl sm:text-3xl lg:text-4xl"
```

Isso significa:

- celular: `text-2xl`
- telas pequenas para cima: `text-3xl`
- telas grandes para cima: `text-4xl`

## Impacto funcional

Sem impacto funcional. Foram alteradas apenas classes CSS/Tailwind e documentação.
