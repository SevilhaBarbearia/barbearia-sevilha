# Plataforma de Barbearias

Projeto Next.js + TypeScript + Supabase para várias barbearias na mesma aplicação. A migração transforma os dados anteriores em vínculos da Sevilha. Cada unidade mantém serviços, profissionais, clientes, agenda, fidelidade e configurações próprios.

## Estrutura

```text
barbearia-sevilha/
├── public/
├── src/
│   ├── app/
│   │   ├── [slug]/               # Vitrine, login, reserva, cliente e avaliação
│   │   ├── admin/[slug]/         # Gestão da unidade
│   │   ├── admin/login/
│   │   ├── admin/selecionar/
│   │   ├── plataforma/
│   │   ├── api/
│   │   └── auth/
│   ├── components/              # Componentes visuais e formulários
│   ├── features/                # Tenancy, clientes, fidelidade, notificações e gestão
│   └── lib/                     # Supabase, autorização, validações e utilidades
├── supabase/
│   ├── migrations/              # 001 a 021, em ordem
│   ├── functions/process-notifications/
│   ├── setup/notifications_cron.sql
│   ├── config.toml
│   └── seed.sql                 # Somente desenvolvimento
├── tests/
├── docs/
├── .env.example
├── package.json
└── package-lock.json
```

## Instalar

Use Node.js 22.18 ou superior e npm.

```bash
npm ci
cp .env.example .env.local
```

Preencha as três variáveis públicas em `.env.local`, aplique as migrations conforme `docs/MIGRACAO_SAAS.md` e execute:

```bash
npm run dev
```

Acesse `/sevilha`. O login de clientes usa Google; o painel administrativo usa e-mail e senha. Configure o provedor Google e o callback no Supabase antes de testar o login real.

## Recursos

- Unidade por slug, organização com várias unidades e criação controlada pelo administrador da plataforma.
- Catálogo, preços, profissionais, expediente semanal, pausa e bloqueios próprios.
- Reservas transacionais com preço/duração calculados no banco, prazo de cancelamento e prevenção de sobreposição.
- Painel administrativo, pagamentos presenciais e totais de faturamento agregados no banco.
- Fidelidade por atendimento, valor do serviço concluído ou regra por serviço; criação/edição de recompensas, resgate atômico e extrato.
- Aniversários por e-mail com texto e horário configuráveis, respeitando fuso e consentimento.
- Pesquisa após conclusão, token de uso único, média geral, últimos 30 dias, por profissional e comentários recentes.
- Nome, descrição, logo, banner, cores e contatos próprios; upload de imagens JPG/PNG/WebP de até 5 MB para caminhos separados por unidade.
- Validações, retorno de erros nos formulários, tela global de erro, RLS, auditoria e fila de e-mails com tentativas limitadas.

As recompensas são entregues pelo estabelecimento; o resgate registra e desconta pontos, sem alterar automaticamente o pagamento. Os planos são registros administrativos; não há cobrança automática nem bloqueio de recursos por plano. WhatsApp/SMS estão previstos no modelo, mas o envio desta versão usa apenas Resend.

## Rotas

- `/{slug}` e `/{slug}/reservar`
- `/{slug}/cliente/agendamentos`, `/historico`, `/perfil`, `/fidelidade`
- `/{slug}/avaliar/{token}`
- `/admin/login`, `/admin/selecionar`, `/admin/{slug}`
- `/plataforma`

Links antigos conhecidos da Sevilha redirecionam para os caminhos com slug. O login e o callback mantêm a unidade atual.

## Validar

```bash
npm run typecheck
npm test
npm run format:check
npm run build
```

Com Deno instalado:

```bash
deno check supabase/functions/process-notifications/index.ts
deno test --allow-env supabase/functions/process-notifications/handler_test.ts
```

Os testes de banco executam todas as migrations em PostgreSQL embarcado (PGlite), com simulação das estruturas de Auth e Storage. Os testes de e-mail simulam o Resend e não enviam mensagens reais. Veja os resultados e limites em `docs/VALIDACAO.md`.

## Guias

- [Banco, e-mail e cron](docs/MIGRACAO_SAAS.md)
- [Contas administrativas](docs/ACESSO_ADMINISTRATIVO.md)
- [Publicação](docs/DEPLOY.md)
- [Validação da entrega](docs/VALIDACAO.md)
- [Arquivos alterados](docs/ARQUIVOS_ALTERADOS.md)
