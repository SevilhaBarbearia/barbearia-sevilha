'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function LoginGoogleButton() {
  async function entrarComGoogle() {
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

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
