# Guia de deploy na Vercel

## 1. Subir projeto no GitHub

```bash
git init
git add .
git commit -m "feat: projeto inicial barbearia"
git branch -M main
git remote add origin https://github.com/seuusuario/barbearia-pro.git
git push -u origin main
```

## 2. Importar na Vercel

1. Acesse Vercel.
2. Clique em **Add New Project**.
3. Importe o repositório.
4. Framework: Next.js.
5. Configure as variáveis de ambiente.

## 3. Variáveis na Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app
```

## 4. Ajustar Supabase Auth

Em Supabase > Authentication > URL Configuration:

- Site URL: `https://seu-dominio.vercel.app`
- Redirect URLs:
  - `https://seu-dominio.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 5. Build

A Vercel executará:

```bash
npm install
npm run build
```

## 6. Checklist após deploy

- Testar login com Google.
- Completar telefone.
- Criar reserva.
- Acessar painel admin.
- Registrar pagamento presencial.
- Verificar faturamento básico.
