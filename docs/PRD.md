# PRD — Sevilha SaaS
**Versão:** 13/10/2026

## Visão
SaaS multi-tenant para barbearias. Página pública por slug, catálogo, agenda, reservas, área do cliente, painel admin, fidelidade, notificações, feedback, Platform Admin. Valor central: reduzir fila física via agendamento + fila virtual.

**Fila virtual: não implementada. PROPOSTA A VALIDAR.**

## Dores
Cliente: pergunta horário, espera, não vê histórico. Barbeiro: conflito de agenda, não sabe quem chegou. Dono: administrar equipe, preços, agenda, pagamentos, indicadores; separar cancelamento de no-show; crescer sem misturar dados.

## Objetivos
Reserva simples · sem conflito · reduzir fila física · mobile-first · isolamento entre tenants · eventos · pagamento presencial (sem checkout) · preparar escala.

## Fora de escopo
Checkout online · cobrança recorrente · SMS/WhatsApp auth · fila virtual em produção · SLA numérico.

## Personas
Visitante (reservar com conta ou guest), Barbeiro (própria agenda), Dono (operação da unidade), Platform Admin (gerenciar tenants, features, auditoria — login independente).

## Sprints
0 Stack · 1 Catálogo · 2 Reservas + guest + máquina de estados · 3 Painel + pagamento + relatórios · 4 Fidelidade + notificações + feedback · 5 Segurança + sessão 30min + no-show · 6 Platform Admin + login independente · 7 Fila virtual (backlog) · 8 LGPD (backlog).

## Estados do agendamento
`pending → confirmed → completed | canceled | no_show`. Ativos para conflito: pending+confirmed. Terminais: completed/canceled/no_show.

## Fila virtual (proposta)
Ciclo separado do agendamento. Estados: waiting, called, in_service, completed, canceled, no_show. Eventos: queue_joined, queue_called, queue_service_started, queue_completed, queue_canceled, queue_no_show, queue_reordered. Invariantes: tenant no servidor, ordem atômica, transações, idempotência, banco é fonte, RLS isola.

## Requisitos funcionais
FR-01 página por slug · FR-02 catálogo · FR-03 barbeiros+serviços · FR-04 expediente/pausas/bloqueios · FR-05 disponibilidade · FR-06 reserva conta/guest · FR-07 consultar/cancelar · FR-08 administrar reservas · FR-09 no-show estruturado · FR-10 pagamento presencial · FR-11 totais por paid · FR-12 fidelidade · FR-13 aniversário e-mail · FR-14 pesquisa · FR-15 branding por tenant · FR-16 Platform Admin · FR-17 fila virtual (backlog) · FR-18 prioridade/check-in (NOT DEFINED).

## RNF
Segurança (RLS, validação server-side) · Integridade (RPCs transacionais) · Escalabilidade (sem N+1, índices) · UX (mobile-first) · Manutenção (TS estrito, testes).

## Critérios de aceite
Cliente vê serviço/profissional/preço/duração/slots · recusa passado/bloqueio/fora-expediente/conflito · cliente só vê o próprio · gestor não opera outro tenant · no-show só após início · pagamento atualiza indicador só quando paid.
