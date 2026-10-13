# Protocolo de trabalho

## Regra de ouro
Segurança acima de velocidade. Não quebrar o que funciona. Não inventar.

## Fluxo
Direto na main · um bloco por vez · tag pre-bloco-N antes de cada bloco · migrations aditivas · .bak de todo arquivo · npm test verde antes de commitar · deploy Vercel verde antes de taguear · commit seletivo (nunca git add -A cego) · rollback escrito antes de aplicar.

## Ordem de cada bloco
1 escrever SQL/script · 2 --dry-run · 3 aplicar (banco primeiro quando toca banco) · 4 npm test · 5 commit seletivo · 6 push · 7 deploy verde · 8 tag pre-bloco-N+1 · 9 checklist manual.

## Onde cada coisa vive
SQL/migração → SQL Editor do Supabase. Código → git. Script local → só quando necessário. Docs consolidados → docs/.

## O que a IA precisa
Estado real do banco · estado do git (git log -3, git status) · deploy Vercel (verde/vermelho) · decisões que só o dono toma. Sempre que possível, script curto que coleta tudo.

## O que a IA entrega
Diagnóstico (severidade, quem explora, evidência, correção, esforço, estado) · Correção (SQL/script curto com pré-condições, --dry-run, rollback, ordem, checklist) · Documento (.md em docs/).

## Severidade
Crítico (cross-tenant com PII, escalada, bypass, takeover) · Alto (bypass comercial, DoS, enumeração) · Médio (cross-tenant sem PII, info-disclosure, sem rate-limit em leitura, sem observabilidade) · Baixo (hardening) · Conformidade (LGPD, retenção, base legal). Item sem verificação → pendente, sem severidade.

## Erros comuns a evitar
Heredoc gigante (preferir scripts curtos ou SQL direto) · presumir migrations (schema_migrations pode não existir; detectar por marcadores) · presumir colunas de Auth em fixtures PGlite (ajustar no mesmo commit) · presumir deploy (npm test verde E Vercel verde) · presumir HSTS/CSP (curl -I antes).

## Changelog por arquivo
CHANGELOG.md (raiz): título ## [versao] — Bloco (data); Adicionado/Alterado/Corrigido/Notas; lista "arquivo → o que mudou"; migrations; testes; riscos.

## Quando a IA erra
Erro é da IA. Corrige e segue.

## Antipadrões
Pedir passo a passo no chat em vez de mandar script · heredoc grande · git add -A cego · migração sem rollback · commit antes de npm test verde · tag antes de deploy verde · migration que mexe em Auth sem ajustar fixture · declarar vulnerabilidade sem evidência.
