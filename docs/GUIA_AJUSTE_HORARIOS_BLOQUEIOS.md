# Ajuste de Horários e Bloqueios

## O que foi alterado

- A página `/admin/horarios` agora exibe apenas um dia por vez.
- O filtro de dia não possui mais a opção de exibir todos os dias, reduzindo poluição visual.
- O formulário de bloqueio foi simplificado para:
  - barbeiro;
  - dia do bloqueio;
  - horário inicial;
  - horário final;
  - motivo/observação.
- A action continua gravando `start_at` e `end_at` na tabela `blocked_slots`, mantendo compatibilidade com o banco existente.
- Foi mantido fallback para formulários antigos que ainda enviem `start_at` e `end_at` diretamente.

## Funcionalidades preservadas

- Cadastro, edição, ativação/desativação e exclusão de expedientes.
- Cadastro e remoção de bloqueios.
- Validação de admin.
- RLS e Supabase.
- Regras de reserva e disponibilidade.
- Login e callback da Vercel.
