'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

function obterOrigemAtual() {
  // Em produção, usar window.location.origin evita que um valor antigo da Vercel
  // ou do .env local faça o OAuth voltar para http://localhost:3000.
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

export function LoginGoogleButton() {
  async function entrarComGoogle() {
    const supabase = createClient();
    const siteUrl = obterOrigemAtual();

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/reservar`
      }
    });
  }

  return (
    <Button type="button" onClick={entrarComGoogle} className="w-full">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-black text-zinc-950">G</span>
      Entrar com Google
    </Button>
  );
}
