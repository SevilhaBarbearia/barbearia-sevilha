import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permiteAdministracao } from './admin-policy';
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

export async function obterAdministradorAtual() {
  const { user, profile } = await obterUsuarioAtual();
  if (!user || profile?.role !== 'admin' || !profile.is_active) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !permiteAdministracao(user.id, profile, data?.claims)) return null;
  return { user, profile };
}

export async function exigirAdmin() {
  const admin = await obterAdministradorAtual();
  if (!admin) redirect('/admin/login');
  return admin;
}

export function podeGerenciarAgenda(role?: string | null) {
  return role === 'admin' || role === 'barber';
}
