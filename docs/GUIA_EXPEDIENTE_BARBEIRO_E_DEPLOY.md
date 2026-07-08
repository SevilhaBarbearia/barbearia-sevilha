# Ajuste de expediente por barbeiro e deploy na Vercel

## O que mudou

A gestão de expediente foi movida para o cadastro/edição do barbeiro.

Agora, em `/admin/barbeiros`, cada barbeiro possui estes campos:

- início do expediente;
- fim do expediente;
- início do intervalo;
- fim do intervalo.

Ao salvar o barbeiro, o sistema aplica esse expediente internamente de segunda a sábado na tabela `business_hours`.

Domingo permanece fechado por padrão.

A tela `/admin/horarios` deve ser usada apenas para criar e consultar bloqueios específicos, como folga, manutenção, compromisso ou indisponibilidade temporária.

## Por que essa decisão

A barbearia não precisa gerenciar visualmente um card para cada dia da semana quando o expediente é padrão. Isso evita uma tela poluída e reduz erro operacional.

A estrutura do banco continua usando `business_hours` por dia porque isso é mais seguro para cálculo de disponibilidade. A diferença é que o painel agora abstrai essa complexidade para o usuário.

## Como publicar corretamente na Vercel

Se local funciona e a Vercel não muda, quase sempre o problema é um destes:

1. Você alterou uma pasta local que não é a pasta do repositório conectado à Vercel.
2. Você não fez `git commit`.
3. Você não fez `git push`.
4. A Vercel está conectada a outro repositório ou outra branch.
5. O deploy foi feito com cache antigo.

Fluxo seguro:

```bash
git status
git remote -v
git branch
git add .
git commit -m "fix: expediente por barbeiro e tela de bloqueios"
git push
```

Depois confira na Vercel:

- Project > Deployments
- o último deploy precisa mostrar o mesmo commit que você acabou de enviar ao GitHub.

Se não aparecer, a Vercel não está apontando para esse repositório/branch.

Quando estiver em dúvida, use **Redeploy sem cache**.
