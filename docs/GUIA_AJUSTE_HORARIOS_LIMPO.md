# Ajuste da tela de horários e bloqueios

Esta versão remove a lista visual de expediente cadastrado por dia da semana para deixar o painel administrativo mais limpo.

## O que mudou

- A tela `/admin/horarios` não exibe mais um card para cada dia da semana.
- Barbeiros ativos passam a ser tratados como disponíveis todos os dias pelo expediente padrão.
- A tela mostra somente bloqueios cadastrados para o dia selecionado.
- Foi criado um bloco recolhível chamado **Expediente padrão**, usado apenas quando o admin quiser alterar o horário geral de um barbeiro.
- O formulário de bloqueio continua salvando na tabela `blocked_slots` com `start_at` e `end_at`.
- Os selects usam o componente visual customizado do projeto, evitando o menu nativo desalinhado do navegador.

## Banco de dados

Foi adicionada a migration:

```txt
supabase/migrations/006_expediente_padrao_todos_os_dias.sql
```

Ela garante que barbeiros existentes tenham registros internos de expediente para todos os dias, sem precisar mostrar isso na interface.

Execute essa migration uma única vez no Supabase se o banco já estiver criado.

## Funcionalidades preservadas

- Login Google/Supabase Auth.
- Reserva do cliente.
- CRUD de serviços.
- CRUD de barbeiros.
- Cálculo de horários disponíveis.
- Bloqueios de horário.
- Pagamentos presenciais.
- RLS e permissões existentes.
