-- Aplicar antes do deploy do login administrativo.
begin;

-- O banco exige conta admin ativa E autenticação por senha.
-- Uma sessão Google, inclusive de uma identidade vinculada, não recebe poderes admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  ) and coalesce(auth.jwt() -> 'amr', '[]'::jsonb)
      @> '[{"method":"password"}]'::jsonb;
$$;

-- Perfis são criados pelo trigger confiável de auth.users.
-- Nenhum usuário pode inserir um perfil admin ou mudar seu próprio papel/ativação.
drop policy if exists profiles_insert_own on public.profiles;
revoke all privileges on public.profiles from public, anon, authenticated;
revoke update(id, role, provider, is_active, created_at) on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update(full_name, email, phone, avatar_url, updated_at, last_login_at)
  on public.profiles to authenticated;

commit;
