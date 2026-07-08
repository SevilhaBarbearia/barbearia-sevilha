# Guia de Layout e UX

Esta versão recebeu uma camada visual mais profissional para parecer uma barbearia real e não apenas um painel técnico.

## O que foi ajustado

- Logo local em `public/logo-barbearia.svg`.
- Ilustração visual de barbearia em `public/hero-barbearia.svg`.
- Pattern visual em `public/pattern-barbearia.svg`.
- Home com hero mais forte, cards de serviços com imagem, equipe com foto e seção de contato.
- Botões com aparência mais clara de clique: sombra, borda, hover e foco.
- Inputs, selects e textareas com estados de foco mais visíveis.
- Painel admin com sidebar visual, ícones e navegação mais clara.
- Tela de reserva em etapas para reduzir confusão do cliente.
- Login e completar cadastro com layout mais premium.

## Como trocar o logo

Substitua o arquivo:

```txt
public/logo-barbearia.svg
```

Mantenha o mesmo nome para não precisar alterar o código.

## Como trocar a imagem principal

Substitua o arquivo:

```txt
public/hero-barbearia.svg
```

Você pode usar um `.jpg`, `.png` ou `.webp`, mas nesse caso altere os imports onde a imagem é usada.

## Como colocar imagem real nos serviços

No painel administrativo, acesse:

```txt
/admin/servicos
```

E preencha o campo:

```txt
URL da imagem
```

Pode ser uma imagem hospedada no Supabase Storage ou em outro local público.

## Como colocar foto real dos barbeiros

No painel administrativo, acesse:

```txt
/admin/barbeiros
```

E preencha:

```txt
URL da foto
```

Para produção, o ideal é criar depois um upload de imagem usando Supabase Storage, evitando depender de links externos.

## Próximas melhorias recomendadas

1. Upload de logo, fotos e imagens via Supabase Storage.
2. CRUD completo de horários e bloqueios.
3. Personalização de cores no painel de configurações.
4. Página pública individual para cada barbeiro.
5. Galeria de cortes e depoimentos.
