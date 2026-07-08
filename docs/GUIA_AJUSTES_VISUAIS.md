# Guia de ajustes visuais - Sevilha Barbearia

Esta atualização corrige pontos visuais apontados na validação de layout, sem alterar funcionalidades já implementadas.

## O que foi ajustado

1. **Marca**
   - Nome exibido alterado para `Sevilha Barbearia`.
   - Logo recebeu espaçamento maior entre ícone e texto.
   - Título da aplicação e fallback da página pública foram atualizados.

2. **Botões principais**
   - Botões de chamada para reserva receberam `min-width` e maior espaçamento entre si.
   - O objetivo é deixar claro que são elementos clicáveis e evitar aparência comprimida.

3. **Horários disponíveis**
   - Os labels dos horários foram ajustados com maior altura mínima, espaçamento interno e gap entre opções.
   - A lógica de seleção por radio button foi mantida.

4. **Cards de serviços**
   - A duração saiu da imagem de capa e foi para o cabeçalho do conteúdo do card.
   - Nome do serviço e duração agora ficam em áreas separadas, evitando sobreposição visual.

## Arquivos alterados

- `src/components/brand/Logo.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/agendamento/SeletorHorario.tsx`
- `README.md`
- `supabase/migrations/001_schema.sql`
- `supabase/migrations/005_branding_sevilha.sql`

## Observação técnica

A migration `005_branding_sevilha.sql` apenas atualiza o nome salvo em `business_settings` para bancos já existentes. Ela não muda tabelas, policies, constraints, autenticação ou regras de reserva.
