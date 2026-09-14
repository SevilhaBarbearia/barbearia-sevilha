# Validação da entrega

Validação local concluída em 13/09/2026.

| Verificação | Resultado |
|---|---|
| TypeScript do Next.js | Aprovado pelo typecheck e pelo build |
| Build de produção | Aprovado; rotas operacionais com slug |
| Testes Node | 13 entradas aprovadas: 12 cenários de autorização e uma suíte de integração de banco |
| Banco PGlite | 21 migrations e seed de desenvolvimento executados |
| Edge Function/Deno | Verificação de tipos aprovada |
| Testes da rotina de e-mail | 3 aprovados, com chamadas externas simuladas |
| Formatação do código web | Prettier aplicado |

## Cenários do banco

A suíte executa SQL real em PostgreSQL embarcado e cobre criação transacional da empresa, unidades da mesma organização, preservação de reserva anterior à migração, atualização de cadastro e preferências, negação de gravação direta de reservas, disponibilidade em fuso local, conflito de horários, referência entre tenants recusada, isolamento de proprietário, conclusão sem duplicação de pontos, resgate sem saldo negativo, avaliação de uso único, payload privado, aniversário idempotente, reclamação da fila, novas tentativas e revogação do consentimento.

Os testes do worker verificam método/autorização, link da unidade correta, envio com chave idempotente, remoção do token após confirmação e reagendamento de falha.

## Limites da validação

Auth, JWT e as tabelas de Storage são simulados no PGlite. A suíte não inicia a infraestrutura completa do Supabase, não executa `pg_cron`/`pg_net` e não simula carga com várias conexões concorrentes. A proteção de concorrência usa transações, bloqueios de linha e a constraint de exclusão do PostgreSQL; o teste confirma a rejeição de sobreposição.

O build usou variáveis públicas fictícias para compilar. Não houve conexão com o banco de produção, publicação na Vercel, configuração de domínio, login Google real, upload ao Storage real ou envio de e-mail real. Esses fluxos precisam das credenciais do ambiente descritas nos guias. Nenhuma mensagem foi enviada a terceiros nesta validação.

As listagens operacionais têm limites de página/consulta para o piloto; totais de faturamento e satisfação são agregados diretamente no banco. A entrega não inclui WhatsApp, cobrança recorrente, domínio próprio por unidade, expiração automática de pontos ou relatórios avançados.
