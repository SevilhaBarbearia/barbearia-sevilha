# Guia de horários e bloqueios

Esta etapa implementa o CRUD administrativo de horários de atendimento e bloqueios específicos.

## O que foi adicionado

- Tela `/admin/horarios` funcional.
- Cadastro de expediente por barbeiro e dia da semana.
- Edição de expediente.
- Ativação e desativação de expediente.
- Exclusão de expediente.
- Cadastro de bloqueios específicos com data/hora inicial e final.
- Remoção de bloqueios.
- Validação com Zod para impedir horários finais menores que horários iniciais.
- Validação de pausa dentro do expediente.
- Revalidação das telas públicas e administrativas após salvar.

## Como o expediente influencia as reservas

A tela de reserva consulta a API `/api/horarios-disponiveis`.

Essa API considera:

1. serviço escolhido e sua duração;
2. barbeiro escolhido;
3. expediente ativo do barbeiro;
4. pausa cadastrada no expediente;
5. reservas ativas (`pending` e `confirmed`);
6. bloqueios cadastrados;
7. horários no passado.

Se um barbeiro não tiver expediente ativo para o dia escolhido, nenhum horário aparece para o cliente.

## Diferença entre expediente e bloqueio

Expediente é a regra semanal fixa.

Exemplo:

- Segunda-feira, das 08:00 às 18:00.
- Pausa das 12:00 às 13:00.

Bloqueio é um impedimento específico em data e horário.

Exemplo:

- 15/07/2026, das 14:00 às 16:00, manutenção da cadeira.
- 20/07/2026, dia inteiro, folga do barbeiro.

## Segurança

As ações usam `exigirAdmin()` antes de gravar no banco.

As tabelas continuam protegidas por RLS no Supabase:

- `business_hours`
- `blocked_slots`

A chave `service_role` não é usada no frontend.

## Filtro de barbeiros por serviço

A tela de reserva agora filtra os barbeiros conforme o serviço escolhido.

Exemplo:

- se João realiza Corte e Barba, ele aparece nesses serviços;
- se Pedro realiza apenas Barba, ele não aparece quando o cliente escolhe Corte.

A API de horários também valida esse vínculo antes de devolver horários disponíveis.
