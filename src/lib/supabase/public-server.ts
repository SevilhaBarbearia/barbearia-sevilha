import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Eu uso um cliente público sem cookies para leituras anônimas que podem
 * entrar no cache do servidor sem depender da sessão de quem abriu a página.
 */
export function createPublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase público não configurado.");
  }

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
