# Backlog de privacidade / LGPD

## Status

**BACKLOG / NÃO IMPLEMENTADO**

Este documento registra itens que precisam de uma etapa própria de privacidade.
O fato de um tenant ser arquivado não significa que a plataforma já possua
uma política completa de retenção ou atendimento aos direitos do titular.

## LGPD — direitos do titular após encerramento de tenant

Cenário que precisa ser tratado futuramente:

- uma barbearia é cancelada/arquivada;
- os dados operacionais são preservados por segurança e integridade;
- um cliente final solicita acesso, correção, anonimização ou eliminação dos
  seus dados pessoais.

Antes de considerar esse fluxo implementado, será necessário definir e
desenvolver:

- canal para solicitação do titular;
- confirmação segura da identidade do solicitante;
- política e prazos de retenção;
- base legal aplicável a cada categoria de dado;
- anonimização quando a exclusão física não puder ser feita;
- tratamento de histórico de agendamentos e registros financeiros;
- tratamento de telefone, e-mail, aniversário e preferências;
- tratamento de fidelidade, feedbacks e notificações;
- política para backups e cópias de segurança;
- auditoria de quem recebeu, aprovou e executou a solicitação;
- comunicação de conclusão ao titular;
- procedimento específico quando o controlador/barbearia encerrou a operação.

## Regra atual

O Platform Admin utilizará soft delete/arquivamento para tenants.

Esse comportamento existe para evitar perda acidental de dados e NÃO deve ser
interpretado como solução definitiva para retenção de dados pessoais ou
atendimento de solicitações LGPD.
