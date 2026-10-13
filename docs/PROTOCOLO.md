# Protocolo de trabalho

**Atualizado:** 13/10/2026

## 1. Regra de ouro

**Segurança acima de velocidade. Não quebrar o que funciona. Não inventar.**

## 2. Fluxo

- Direto na `main`. Sem branches.
- **Um bloco por vez.** Nunca misturar dois blocos no mesmo commit.
- Tag `pre-bloco-N` antes de cada bloco.
- Migrations **aditivas**. Nunca apagar/renomear coluna no mesmo bloco que deixa de usá-la.
- `.bak` de todo arquivo alterado.
- `npm test` verde antes de commitar.
- Deploy Vercel verde antes de taguear.
- Commit **seletivo** — nunca `git add -A` cego.
- Rollback escrito antes de aplicar migração.

## 3. Ordem de cada bloco

1. Escrever SQL/script.
2. `--dry-run` quando aplicável.
3. Aplicar (banco primeiro se o bloco toca banco).
4. `npm test`.
5. Commit seletivo.
6. Push.
7. Deploy verde.
8. Tag `pre-bloco-N+1`.
9. Checklist manual pós-deploy.

## 4. Onde cada coisa vive

- **SQL/migração:** SQL Editor do Supabase. Simples, direto, sem script.
- **Código:** git no repositório.
- **Script local:** só quando estritamente necessário.
- **Documento consolidado:** `docs/`.

## 5. Coleta antes de implementar

**Regra:** reunir TUDO que a IA precisa em **uma coleta única**, em vez de perguntar item por item no chat.

Formato padrão:
- Script `bash` **somente leitura** que produz **um arquivo TXT** na raiz (`_coleta-AAAAMMDD.txt`).
- O TXT já está no `.gitignore` (`_coleta-*.txt`).
- Cada seção limitada e identificada; avisa quando trunca.
- **Nunca** imprime valores de `.env`. Apenas verifica se o arquivo existe.

O que a coleta costuma trazer:
- Corpos completos de RPCs envolvidas.
- Grep de autorização (`getUser`, `getClaims`, `getSession`, `is_platform_admin`).
- Schemas de tabelas tocadas.
- Rotas existentes em `src/app` (para colisão de slug).
- Estado do git (`git log -3`, `git status --short`).
- Docs relevantes.

## 6. O que a IA precisa do dono

- Estado real do banco (query SQL, não presunção).
- Estado do git.
- Deploy Vercel (verde/vermelho).
- Decisões de produto que só o dono toma (ex.: caminho A ou C).

## 7. O que a IA entrega

**Diagnóstico:** severidade (Crítico/Alto/Médio/Baixo/Conformidade), **quem explora** (anônimo / autenticado cross-tenant / admin do tenant), evidência (arquivo/linha, policy, SQL), correção proposta, esforço (P/M/G), **estado da evidência** (confirmado no dump / pendente no banco).

**Correção:** SQL ou script curto com:
- Pré-condições (HEAD esperado, git status limpo).
- `--dry-run` quando aplicável.
- SQL de reversão.
- Ordem exata de aplicação.
- Checklist manual pós-deploy.

**Documento:** `.md` em `docs/`. Um por tema.

## 8. Classificação de severidade

- **Crítico:** cross-tenant com PII, escalada de privilégio, bypass de auth, account takeover.
- **Alto:** bypass de regra comercial, DoS prático, enumeração identificável.
- **Médio:** cross-tenant sem PII, info-disclosure não-PII, sem rate-limit em leitura, sem observabilidade.
- **Baixo:** hardening.
- **Conformidade:** LGPD, retenção, base legal.

**Regra:** item sem verificação concluída **não recebe severidade** — recebe "pendente".

## 9. Erros comuns a evitar

- **Heredoc gigante** embaralha no Git Bash → scripts curtos ou SQL direto no Supabase.
- **Presumir migrations** — `supabase_migrations.schema_migrations` pode não existir; detectar por marcadores.
- **Presumir colunas de Auth em fixtures PGlite** → ajustar no **mesmo commit** que a migration.
- **Presumir deploy** → `npm test` verde **e** Vercel verde antes de tag.
- **Presumir HSTS/CSP** → `curl -I` antes de declarar ausente.
- **Mexer em Auth sem convite** → nunca senha temporária em texto.

## 10. Changelog por arquivo

`CHANGELOG.md` (raiz) com:
- Título: `## [versão] — Bloco (data)`.
- Seções: Adicionado / Alterado / Corrigido / Notas.
- Lista "arquivo → o que mudou e por quê".
- Migrations afetadas.
- Testes executados e resultado.
- Riscos ou etapas operacionais.

## 11. Quando a IA erra

Erro é da IA. Corrige e segue. Se um teste falha por setup, é problema da IA, não do ambiente.

## 12. Antipadrões que a IA evita

- Pedir passo a passo no chat em vez de mandar script.
- Heredoc grande.
- `git add -A` cego.
- Aplicar migração sem rollback.
- Commit antes de `npm test` verde.
- Tag antes de deploy verde.
- Migration que mexe em Auth sem ajustar fixture.
- Declarar vulnerabilidade sem evidência.
- **Convite de usuário sem `inviteUserByEmail`** — sempre usar o fluxo nativo do Supabase Auth.
- **Senha em texto** em e-mail, banco ou logs.
- **`user_metadata` para controle de estado** — só `app_metadata` (service role).


## 12. Regras da sessao atual

- **Server actions logam no terminal, não no browser.** Sempre olhar o \`npm run dev\`.
- **Nunca abrir link de convite na mesma sessão** onde se está logado como Platform Admin — o Supabase rejeita. Usar outro navegador ou janela anônima limpa.
- **Limpar tenant/usuário antes de testar de novo**: \`set session_replication_role = replica\` antes de \`delete from barbershops\` (senão FK \`audit_logs_barbershop_id_fkey\` falha).
- **\`write_platform_audit\` exige \`is_platform_admin()\`** — não chamar em trigger de Auth (o usuário ainda não tem sessão). Usar \`INSERT\` direto em \`platform_audit_logs\`.
- **Migration que toca \`auth.users\`** exige ajuste no fixture PGlite **no mesmo commit**.
- **Heredoc gigante embaralha no Git Bash** — sempre quebrar em blocos de ~50 linhas ou colar direto no SQL Editor.

## 13. Estado do projeto (referência rápida)

- Último HEAD conhecido: \`ac7ab98\`
- Banco: migrations 001–033 aplicadas
- Testes: 52/52
- Plataforma redesenhada no padrão admin
- Onboarding por convite funcional
- Pendências principais em \`docs/HANDOFF.md\`
