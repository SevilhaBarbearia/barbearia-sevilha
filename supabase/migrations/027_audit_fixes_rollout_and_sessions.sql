-- 027_audit_fixes_rollout_and_sessions.sql
--
-- Este bloco fecha dois pontos da auditoria antes de novos tenants:
-- 1. rollback visual individual por barbearia;
-- 2. expiração por inatividade validada no servidor por sessão.
--
-- O rollback continua sendo somente de UI. Regras de negócio, RLS,
-- reservas e correções de segurança não são revertidas.

begin;

-- ================================================================
-- 1. ROLLOUT / ROLLBACK INDIVIDUAL POR TENANT
-- ================================================================

alter table public.barbershops
  add column if not exists ui_version text not null default 'warm-premium';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbershops_ui_version_check'
      and conrelid = 'public.barbershops'::regclass
  ) then
    alter table public.barbershops
      add constraint barbershops_ui_version_check
      check (ui_version in ('legacy', 'warm-premium'));
  end if;
end;
$$;

comment on column public.barbershops.ui_version is
  'Versão visual do tenant. Permite rollback individual sem afetar outras barbearias.';

-- Tenants que já estavam aprovados em Warm Premium permanecem no padrão.
update public.barbershops
set ui_version = 'warm-premium'
where ui_version is null;

-- ================================================================
-- 2. SESSÃO DA APLICAÇÃO COM INATIVIDADE REAL DE 30 MINUTOS
-- ================================================================
--
-- O Supabase mantém um session_id estável no JWT durante os refreshes.
-- Eu uso esse identificador para controlar atividade humana por sessão,
-- e não apenas por usuário. Assim, dois navegadores/dispositivos não
-- renovam a sessão um do outro.

create table if not exists public.app_session_activity (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_session_activity_user_idx
  on public.app_session_activity(user_id, last_activity_at desc);

alter table public.app_session_activity enable row level security;

-- A tabela não é acessada diretamente pelo navegador.
-- Somente as funções SECURITY DEFINER abaixo podem consultá-la/alterá-la.
revoke all on table public.app_session_activity from public, anon, authenticated;

-- Esta função é chamada pelo servidor em requests autenticados.
-- Se a sessão ainda não possui registro (primeiro request após login ou
-- primeiro request após esta migration), eu a inicializo uma única vez.
-- Um registro expirado nunca é renovado por esta função.
create or replace function public.check_current_app_session()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_session_id uuid;
  current_user_id uuid;
  last_activity timestamptz;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return false;
  end if;

  current_session_id := nullif(
    auth.jwt() ->> 'session_id',
    ''
  )::uuid;

  if current_session_id is null then
    return false;
  end if;

  insert into public.app_session_activity (
    session_id,
    user_id,
    last_activity_at,
    created_at,
    updated_at
  )
  values (
    current_session_id,
    current_user_id,
    now(),
    now(),
    now()
  )
  on conflict (session_id) do nothing;

  select asa.last_activity_at
  into last_activity
  from public.app_session_activity asa
  where asa.session_id = current_session_id
    and asa.user_id = current_user_id;

  if not found then
    return false;
  end if;

  return last_activity > now() - interval '30 minutes';
end;
$$;

revoke all
on function public.check_current_app_session()
from public, anon;

grant execute
on function public.check_current_app_session()
to authenticated;

-- O heartbeat só consegue atualizar uma sessão que ainda está ativa.
-- Isso impede que um request tardio "ressuscite" uma sessão que já passou
-- dos 30 minutos de inatividade.
create or replace function public.touch_current_app_session()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_session_id uuid;
  current_user_id uuid;
  affected_rows integer := 0;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return false;
  end if;

  current_session_id := nullif(
    auth.jwt() ->> 'session_id',
    ''
  )::uuid;

  if current_session_id is null then
    return false;
  end if;

  update public.app_session_activity
  set
    last_activity_at = now(),
    updated_at = now()
  where session_id = current_session_id
    and user_id = current_user_id
    and last_activity_at > now() - interval '30 minutes';

  get diagnostics affected_rows = row_count;

  return affected_rows = 1;
end;
$$;

revoke all
on function public.touch_current_app_session()
from public, anon;

grant execute
on function public.touch_current_app_session()
to authenticated;

commit;
