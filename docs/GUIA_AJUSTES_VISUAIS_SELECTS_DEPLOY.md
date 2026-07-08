# Ajustes visuais, selects e deploy

Esta versão corrige pontos visuais sem alterar as regras de negócio já implementadas.

## O que mudou

- Os campos de seleção deixaram de usar o menu nativo visual do navegador e agora usam um select customizado.
- O valor continua sendo enviado por um `<select>` oculto, então os formulários e server actions continuam funcionando normalmente.
- A ilustração da barbearia passou a usar `object-contain` nas telas de login/reserva para não ser cortada em produção.
- O subtítulo da marca foi simplificado de `Agenda Premium` para `Agenda`.
- A frase `Barbearia Premium` foi removida da ilustração.
- A página pública e a tela de reserva foram marcadas como dinâmicas para evitar cache/stale data na Vercel ao buscar dados do Supabase.
- A tela de horários/bloqueios ganhou filtro por dia e barbeiro para não exibir todos os dias da semana de uma vez.
- O `package-lock.json` antigo foi removido porque continha URLs internas de registry e podia quebrar o `npm install` na Vercel. Rode `npm install` localmente para gerar um novo lockfile limpo, se quiser versionar.

## Após substituir o projeto

1. Copie seu `.env.local` para a nova pasta.
2. Rode `npm install`.
3. Teste com `npm run dev`.
4. Faça commit e push para o GitHub.
5. A Vercel fará novo deploy.

## Se serviços/barbeiros não aparecerem na Vercel

Confira na Vercel se as variáveis estão iguais ao ambiente local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=https://SEU-PROJETO.vercel.app
```

Depois faça `Redeploy` sem cache, se a Vercel oferecer essa opção.
