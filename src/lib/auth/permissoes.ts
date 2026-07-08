import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/db/types';

export async function obterUsuarioAtual() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single<Profile>();

  return { user: data.user, profile };
}

export async function exigirUsuario() {
  const { user, profile } = await obterUsuarioAtual();
  if (!user) redirect('/login');
  return { user, profile };
}

export async function exigirPerfilCompleto() {
  const { user, profile } = await exigirUsuario();

  if (!profile?.phone || !profile?.full_name) {
    redirect('/completar-cadastro');
  }

  return { user, profile };
}

export async function exigirAdmin() {
  const { user, profile } = await exigirUsuario();

  if (profile?.role !== 'admin') {
    redirect('/cliente/agendamentos');
  }

  return { user, profile };
}

export function podeGerenciarAgenda(role?: string | null) {
  return role === 'admin' || role === 'barber';
}
